import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import auth from '#app/middleware/auth.js'

import { SendError, throwErr } from '#app/utilities/error.js'

import Location from '#app/models/Location.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'
import validate from '#app/middleware/validation.js'
import { searchFeedSchema } from '#app/validation/customer/deal.js'

const LIMIT = 10 //20 results at a time
const RADIUS_METRES = 20000 //20km

router.get('/', auth, validate(searchFeedSchema), async (req, res) => {
  const {
    query: { page, long, lat, text },
    // coords must be [long, lat]
  } = req

  //https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    const PAGE = page ? Number(page) : 0

    const results = await Location.aggregate([
      {
        $search: {
          index: 'default',
          compound: {
            must: [
              {
                text: {
                  query: text,
                  path: {
                    wildcard: '*',
                  },
                },
              },
              {
                geoWithin: {
                  circle: {
                    center: {
                      type: 'Point',
                      coordinates: [LONG, LAT],
                    },
                    radius: RADIUS_METRES,
                  },
                  path: 'geometry',
                },
              },
            ],
          },
        },
      },
      ...calculateDistancePipeline(LAT, LONG, '$geometry.coordinates', 'distance_miles'),
      {
        $skip: PAGE * LIMIT,
      },
      {
        $limit: LIMIT,
      },
      {
        $lookup: {
          from: 'deals', // Replace with the name of your linked collection
          localField: 'active_deals',
          foreignField: '_id',
          let: { locationId: '$_id' },
          pipeline: [
            {
              $project: {
                match_fav: {
                  $filter: {
                    input: '$favourites',
                    as: 'fav',
                    cond: {
                      $and: [{ $eq: ['$$fav.user', req.user._id] }, { $eq: ['$$fav.location_id', '$$locationId'] }],
                    },
                    limit: 1,
                  },
                },
                name: 1,
                description: 1,
                start_date: 1,
                end_date: 1,
              },
            },
          ],
          as: 'deals',
        },
      },
      { $unwind: '$deals' },
      {
        $project: {
          deal: {
            name: '$deals.name',
            description: '$deals.description',
            id: '$deals._id',
            is_favourited: {
              $cond: {
                if: { $eq: [{ $size: { $ifNull: ['$deals.match_fav', []] } }, 1] },
                then: true,
                else: false,
              },
            },
          },
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
            cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
          },
          location: {
            id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ]).sort({ 'location.distance_miles': 1 })

    return res.json({ nextCursor: results < LIMIT ? undefined : PAGE + 1, deals: results })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
