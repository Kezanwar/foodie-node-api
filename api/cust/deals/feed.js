import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import auth from '../../../middleware/auth.js'

import Location from '../../../models/Location.js'

import { SendError, throwErr } from '../../../utilities/error.js'

const METER_TO_MILE_CONVERSION = 0.00062137

const LIMIT = 2 //20 results at a time
const RADIUS_METRES = 20000 //20km

const getQueryLocations = (cuisines, dietary_requirements) => {
  const defaults = { active_deals: { $ne: [], $exists: true } }
  if (cuisines) {
    defaults.cuisines = {
      $elemMatch: {
        slug: { $in: typeof cuisines === 'string' ? [cuisines] : cuisines },
      },
    }
  }
  if (dietary_requirements) {
    defaults.dietary_requirements = {
      $elemMatch: {
        slug: { $in: typeof dietary_requirements === 'string' ? [dietary_requirements] : dietary_requirements },
      },
    }
  }
  return defaults
}

router.get('/', auth, async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
    // coords must be [long, lat]
  } = req

  //https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates

  try {
    if (!long || !lat) throwErr('No coordinates', 400)

    const LONG = Number(long)
    const LAT = Number(lat)

    const PAGE = page ? Number(page) : 0

    for (let n of [LONG, LAT, PAGE]) {
      if (isNaN(n)) throwErr('You must pass a number for Page, Long or Lat')
    }

    const query = getQueryLocations(cuisines, dietary_requirements)

    const results = await Location.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [LONG, LAT] },
          distanceField: 'distance_miles',
          spherical: true,
          maxDistance: RADIUS_METRES,
          distanceMultiplier: METER_TO_MILE_CONVERSION,
          query: query,
        },
      },
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
          pipeline: [
            {
              $project: {
                match_fav: {
                  $filter: {
                    input: '$favourites',
                    as: 'fav',
                    cond: {
                      $and: [
                        { $eq: ['$$fav.user', req.user._id] },
                        { $eq: ['$$fav.location_id', '$locations.location_id'] },
                      ],
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
            deal_id: '$deals._id',
            is_favourited: {
              $cond: { if: { $eq: [{ $size: '$deals.match_fav' }, 1] }, then: true, else: false },
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

    return res.json({ nextCursor: results.length < LIMIT ? null : PAGE + 1, deals: results })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
