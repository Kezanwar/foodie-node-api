import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import { isValidObjectId } from 'mongoose'

import auth from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import Location from '#app/models/Location.js'

import { makeMongoIDs } from '#app/utilities/document.js'
import { SendError, throwErr } from '#app/utilities/error.js'
import { calculateDistancePipeline } from '#app/utilities/distance-pipeline.js'

import { workerService } from '#app/services/worker/index.js'
import { singleRestaurantSchema } from '#app/validation/customer/restaurant.js'

dotenv.config()

router.get('/:id', auth, validate(singleRestaurantSchema), async (req, res) => {
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
        $project: {
          nickname: 1,
          restaurant: 1,
          address: 1,
          phone_number: 1,
          email: 1,
          opening_times: 1,
          dietary_requirements: 1,
          cuisines: 1,
          active_deals: 1,
          distance_miles: 1,
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
