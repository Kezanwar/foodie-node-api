import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import { isValidObjectId } from 'mongoose'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import Location from '#app/models/Location.js'

import { makeMongoIDs } from '#app/utilities/document.js'
import { SendError, throwErr } from '#app/utilities/error.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

import { workerService } from '#app/services/worker/index.js'
import { singleRestaurantSchema } from '#app/validation/customer/restaurant.js'

dotenv.config()

router.get('/:id', authWithCache, validate(singleRestaurantSchema), async (req, res) => {
  const user = req.user
  const id = req.params?.id

  const { long, lat } = req.query

  const LONG = Number(long)
  const LAT = Number(lat)

  try {
    if (!isValidObjectId(id)) {
      throwErr('Location not found', 404)
    }
    const location = await Location.aggregate([
      {
        $match: {
          _id: makeMongoIDs(id),
        },
      },
      ...calculateDistancePipeline(LAT, LONG, '$geometry.coordinates', 'distance_miles'),
      {
        $lookup: {
          from: 'deals',
          foreignField: '_id',
          localField: 'active_deals.deal_id',
          pipeline: [
            {
              $project: {
                name: 1,
              },
            },
          ],
          as: 'deals',
        },
      },
      {
        $lookup: {
          from: 'restaurants',
          foreignField: '_id',
          localField: 'restaurant.id',
          pipeline: [
            {
              $project: {
                bio: 1,
                booking_link: 1,
              },
            },
          ],
          as: 'rest',
        },
      },
      {
        $project: {
          nickname: 1,
          restaurant: {
            booking_link: { $arrayElemAt: ['$rest.booking_link', 0] },
            bio: { $arrayElemAt: ['$rest.bio', 0] },
            avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
            cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
            name: '$restaurant.name',
            id: '$restaurant.id',
          },
          address: 1,
          phone_number: 1,
          email: 1,
          opening_times: 1,
          dietary_requirements: 1,
          cuisines: 1,
          distance_miles: 1,
          active_deals: '$deals',
          geometry: 1,
        },
      },
    ])

    if (!location.length) throwErr('Location not found', 404)

    const resp = await workerService.call({
      name: 'checkSingleRestaurantFollowAndFav',
      params: [JSON.stringify(user), JSON.stringify(location[0])],
    })

    res.json(resp)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
