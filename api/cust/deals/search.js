import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Location from '#app/models/Location.js'

import auth from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import { SendError } from '#app/utilities/error.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

import { searchFeedSchema } from '#app/validation/customer/deal.js'

import { workerService } from '#app/services/worker/index.js'

const RADIUS_METRES = 20000 //20km

router.get('/', auth, validate(searchFeedSchema), async (req, res) => {
  const {
    query: { long, lat, text },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

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
        $lookup: {
          from: 'deals', // Replace with the name of your linked collection
          localField: 'active_deals.deal_id',
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
            bio: '$restaurant.bio',
            avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
            cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
            cuisines: '$cuisines',
            dietary: '$dietary_requirements',
          },
          location: {
            id: '$_id',
            nickname: '$nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ])

    const sorted = await workerService.call({
      name: 'orderSearchDealsByTextMatchRelevance',
      params: [JSON.stringify(results), text],
    })

    return res.json({ nextCursor: undefined, deals: sorted })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
