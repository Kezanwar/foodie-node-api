import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import Deal from '#app/models/Deal.js'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { singleDealSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

import { worker } from '#app/services/worker/index.js'
import { S3BaseUrl } from '#app/services/aws/index.js'
import DB from '#app/services/db/index.js'

dotenv.config()

router.get('/', authWithCache, validate(singleDealSchema), async (req, res) => {
  const {
    user,
    query: { deal_id, location_id, long, lat },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    const [dealID, locationID] = DB.makeMongoIDs(deal_id, location_id)

    const dealProm = Deal.aggregate([
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
        },
      },
      {
        $lookup: {
          from: 'locations', // Replace with the name of your linked collection
          localField: 'matchedLocation.location_id',
          foreignField: '_id',
          as: 'loc',
          pipeline: [
            {
              $project: {
                _id: 1,
                opening_times: 1,
                address: 1,
                phone_number: 1,
                email: 1,
                geometry: 1,
                nickname: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: 'restaurants', // Replace with the name of your linked collection
          localField: 'restaurant.id',
          foreignField: '_id',
          as: 'rest',
          pipeline: [
            {
              $project: {
                bio: 1,
                booking_link: 1,
              },
            },
          ],
        },
      },

      ...calculateDistancePipeline(LAT, LONG, '$matchedLocation.geometry.coordinates', 'distance_miles'),

      {
        $project: {
          restaurant: {
            id: '$restaurant.id',
            name: '$restaurant.name',
            avatar: { $concat: [S3BaseUrl, '$restaurant.avatar'] },
            cover_photo: { $concat: [S3BaseUrl, '$restaurant.cover_photo'] },
            bio: '$restaurant.bio',
            booking_link: { $arrayElemAt: ['$rest.booking_link', 0] },
          },
          name: 1,
          distance_miles: 1,
          description: 1,
          location: { $arrayElemAt: ['$loc', 0] },
          cuisines: 1,
          dietary_requirements: 1,
          is_expired: 1,
          end_date: 1,
        },
      },
    ])

    const followFavProm = worker.call({
      name: 'checkSingleDealFollowAndFav',
      params: [JSON.stringify(user), deal_id, location_id],
    })

    const [deal, followFav] = await Promise.all([dealProm, followFavProm])

    if (!deal.length) Err.throw('Deal not found', 404)

    deal[0].is_favourited = followFav.is_favourited
    deal[0].is_following = followFav.is_following

    res.json(deal[0])

    // TODO: Add a view to deal here after response has been sent using prom.then
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
