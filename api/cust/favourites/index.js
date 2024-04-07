import { Router } from 'express'

import { authWithCache, authWithFavFollow } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { favouriteDealSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'

const router = Router()

router.post('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req

  try {
    await Promise.all([DB.CFavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return res.json({ deal_id, location_id, is_favourited: true })
  } catch (error) {
    Err.send(res, error)
  }
})

router.patch('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req
  try {
    await Promise.all([DB.CUnfavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return res.json({ deal_id, location_id, is_favourited: false })
  } catch (error) {
    Err.send(res, error)
  }
})

router.get('/', authWithFavFollow, async (req, res) => {
  const {
    results: { following, favourites },
  } = req
  try {
    return res.json({ following, favourites })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
