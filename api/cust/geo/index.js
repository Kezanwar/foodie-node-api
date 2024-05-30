import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Loc from '#app/services/location/index.js'

import validate from '#app/middleware/validate.js'
import { geoSchema } from '#app/validation/customer/geo.js'
import Redis from '#app/services/cache/redis.js'

router.post('/', validate(geoSchema), authWithCache, async (req, res) => {
  const {
    body: { long, lat },
    user,
  } = req

  try {
    if (user?.geometry?.coordinates) {
      if (Loc.getDistanceInMiles(user.geometry.coordinates, [long, lat]) < 1) {
        return res.json('success')
      }
    }

    await Promise.all([DB.setUserGeometry(user, long, lat), Redis.removeUserByID(user)])
    return res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
