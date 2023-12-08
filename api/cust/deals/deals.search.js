import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import auth from '../../../middleware/auth.middleware.js'

import Deal from '../../../models/Deal.js'

import { workerService } from '../../../services/worker/worker.services.js'

import { SendError, throwErr } from '../../../utilities/error.js'

const METER_TO_MILE_CONVERSION = 0.00062137

const LIMIT = 2 //20 results at a time
const RADIUS_METRES = 20000 //20km
const RADIUS_MILES = RADIUS_METRES * METER_TO_MILE_CONVERSION

const r = 6371 // km
const p = Math.PI / 180

const getQueryDeals = (cuisines, dietary_requirements) => {
  const defaults = { is_expired: false }

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

    const query = getQueryDeals(cuisines, dietary_requirements)

    const results = await Deal.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [LONG, LAT] },
          distanceField: 'distance_km',
          spherical: true,
          maxDistance: RADIUS_METRES,
          query: query,
        },
      },
      {
        $skip: PAGE * LIMIT,
      },
      {
        $limit: LIMIT,
      },
      // { $unwind: '$favourites' },
      { $unwind: '$locations' },
      {
        $addFields: {
          dLon: {
            //dLon = (lon2-lon1) * Math.PI / 180
            $multiply: [
              {
                $subtract: [
                  {
                    $arrayElemAt: ['$locations.geometry.coordinates', 0],
                  },
                  LONG,
                ],
              },
              p,
            ],
          },
          dLat: {
            //dLat = (lat2-lat1) * Math.PI / 180
            $multiply: [
              {
                $subtract: [
                  {
                    $arrayElemAt: ['$locations.geometry.coordinates', 1],
                  },
                  LAT,
                ],
              },
              p,
            ],
          },
        },
      },
      {
        $addFields: {
          a1: {
            // Math.sin(dLat/2) * Math.sin(dLat/2)
            $multiply: [{ $sin: { $divide: ['$dLat', 2] } }, { $sin: { $divide: ['$dLat', 2] } }],
          },
          a2: {
            //Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2)
            $multiply: [
              {
                $cos: {
                  $multiply: [{ $multiply: [LAT, p] }],
                },
              },
              {
                $cos: {
                  $multiply: [
                    {
                      $multiply: [
                        {
                          $arrayElemAt: ['$locations.geometry.coordinates', 1],
                        },
                        p,
                      ],
                    },
                  ],
                },
              },
              { $sin: { $divide: ['$dLon', 2] } },
              { $sin: { $divide: ['$dLon', 2] } },
            ],
          },
        },
      },
      //a3 = a1 + a2
      {
        $addFields: {
          a3: { $add: ['$a1', '$a2'] },
        },
      },
      //c = 2 * Math.atan2(Math.sqrt(a3), Math.sqrt(1-a3));
      {
        $addFields: {
          c: {
            $multiply: [
              2,
              {
                $atan2: [{ $sqrt: '$a3' }, { $sqrt: { $subtract: [1, '$a3'] } }],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          distance_miles: {
            $multiply: [{ $multiply: [{ $multiply: [r, '$c'] }, 1000] }, METER_TO_MILE_CONVERSION],
          },
        },
      },
      {
        $addFields: {
          match_fav: {
            $filter: {
              input: '$favourites',
              as: 'fav',
              cond: {
                $and: [{ $eq: ['$$fav.user', req.user._id] }, { $eq: ['$$fav.location_id', '$locations.location_id'] }],
              },
              limit: 1,
            },
          },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          is_favourited: {
            $cond: { if: { $eq: [{ $size: '$match_fav' }, 1] }, then: true, else: false },
          },
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
            cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
          },
          location: {
            id: '$locations.location_id',
            nickname: '$locations.nickname',
            distance_miles: '$distance_miles',
          },
        },
      },
    ]).sort({ 'location.distance_miles': 1 })

    const filtered = await workerService.call({
      name: 'filterDealsByDistance',
      params: [JSON.stringify(results), RADIUS_MILES],
    })

    return res.json({ nextCursor: filtered < LIMIT ? undefined : PAGE + 1, deals: filtered })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
