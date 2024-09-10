import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Task from '#app/services/worker/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'

dotenv.config()

router.get('/:id', authWithCache, async (req, res) => {
  const user = req.user
  const id = req.params?.id

  try {
    if (!DB.isValidID(id)) {
      Err.throw('Restaurant not found', 404)
    }

    const location = await DB.CGetSingleRestaurantLocation(id)

    if (!Permissions.isSubscribed(location?.restaurant.is_subscribed || 0)) {
      Err.throw(`${location.restaurant.name} isn't subscribed anymore`, 404)
    }

    if (!location) {
      Err.throw('Restaurant not found', 404)
    }

    const resp = await Task.checkSingleRestaurantFollowAndFav(user, location)

    Resp.json(req, res, resp)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
