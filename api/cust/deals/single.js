import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import { SendError, throwErr } from '../../../utilities/error.js'
import auth from '../../../middleware/auth.js'
import Deal from '../../../models/Deal.js'
import validate from '../../../middleware/validation.js'
// import { singleDealSchema } from '../../../validation/customer/deal.js'
import { makeMongoIDs } from '../../../utilities/document.js'
import { calculateDistancePipeline } from '../../../utilities/distance-pipeline.js'
import { singleDealSchema } from '../../../validation/customer/deal.js'

dotenv.config()

router.get('/', auth, validate(singleDealSchema), async (req, res) => {
  const {
    query: { deal_id, location_id, long, lat },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    const [dealID, locationID] = makeMongoIDs(deal_id, location_id)

    const deal = await Deal.aggregate([
      {
        $match: {
          _id: dealID,
        },
      },
      {
        $addFields: {
          matchedLocation: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$locations',
                  as: 'location',
                  cond: { $eq: ['$$location.location_id', locationID] },
                },
              },
              0,
            ],
          },
          match_fav: {
            $filter: {
              input: '$favourites',
              as: 'fav',
              cond: {
                $and: [{ $eq: ['$$fav.user', req.user._id] }, { $eq: ['$$fav.location_id', locationID] }],
              },
              limit: 1,
            },
          },
        },
      },

      ...calculateDistancePipeline(LAT, LONG, '$matchedLocation', 'distance_miles'),

      {
        $project: {
          is_favourited: {
            $cond: {
              if: { $eq: [{ $size: { $ifNull: ['$deals.match_fav', []] } }, 1] },
              then: true,
              else: false,
            },
          },
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
            cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
          },
          name: 1,
          distance_miles: 1,
          description: 1,
          location: '$matchedLocation', // Get the first matched location
          cuisines: 1,
          dietary_requirements: 1,
          is_expired: 1,
          end_date: 1,
        },
      },
    ])

    if (!deal.length) throwErr('Deal not found', 404)

    res.json(deal[0])
  } catch (error) {
    SendError(res, error)
  }
})

export default router
