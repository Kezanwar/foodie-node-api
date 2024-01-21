import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import { SendError, throwErr } from '../../../utilities/error.js'
import auth from '../../../middleware/auth.js'
import Deal from '../../../models/Deal.js'
import validate from '../../../middleware/validation.js'
import { singleDealSchema } from '../../../validation/customer/deal.js'
import { makeMongoIDs } from '../../../utilities/document.js'
dotenv.config()

router.get('/', auth, validate(singleDealSchema('query')), async (req, res) => {
  const {
    query: { deal_id, location_id },
  } = req

  const [dealID, locationID] = makeMongoIDs(deal_id, location_id)

  try {
    const deal = await Deal.aggregate([
      {
        $match: {
          _id: dealID,
        },
      },
      {
        $addFields: {
          matchedLocation: {
            $filter: {
              input: '$locations',
              as: 'location',
              cond: { $eq: ['$$location.location_id', locationID] },
            },
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
      {
        $project: {
          is_favourited: {
            $cond: {
              if: { $eq: [{ $size: { $ifNull: ['$deals.match_fav', []] } }, 1] },
              then: true,
              else: false,
            },
          },
          restaurant: 1,
          name: 1,
          description: 1,
          location: { $arrayElemAt: ['$matchedLocation', 0] }, // Get the first matched location
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
