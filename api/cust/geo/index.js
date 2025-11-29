import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'

import validate from '#app/middleware/validate.js'
import { geoSchema } from '#app/validation/customer/geo.js'
import Redis from '#app/services/cache/redis.js'
import Resp from '#app/services/response/index.js'
import { SuccessResponse } from '#app/services/response/http-response.js'
import LocationUtil from '#app/repositories/location/util.js'
import AuthRepo from '#app/repositories/auth/index.js'

router.post('/', validate(geoSchema), authWithCache, async (req, res) => {
  const {
    body: { long, lat },
    user,
  } = req

  try {
    if (user?.geometry?.coordinates) {
      if (LocationUtil.getDistanceInMiles(user.geometry.coordinates, [long, lat]) < 1) {
        return Resp.json(req, res, SuccessResponse)
      }
    }

    await Promise.all([AuthRepo.SetUserGeometry(user, long, lat), Redis.removeUserByID(user)])
    return Resp.json(req, res, SuccessResponse)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
