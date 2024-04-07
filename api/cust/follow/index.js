import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'

import validate from '#app/middleware/validate.js'
import { followRestSchema } from '#app/validation/customer/follow.js'

router.post('/', validate(followRestSchema), authWithCache, async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  try {
    await Promise.all([DB.CFollowOneRestauarant(user, rest_id, location_id), Redis.removeUserByID(user)])

    return res.json({ rest_id, location_id, is_following: true })
  } catch (error) {
    Err.send(res, error)
  }
})

router.patch('/', authWithCache, validate(followRestSchema), async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  try {
    await Promise.all([DB.CUnfollowOneRestaurant(user, rest_id, location_id), Redis.removeUserByID(user)])

    return res.json({ rest_id, location_id, is_following: false })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
