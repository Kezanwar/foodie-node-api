import { Router } from 'express'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { favouriteDealSchema, favouriteFollowSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'
import { FEED_LIMIT } from '#app/constants/deals.js'

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

router.get('/', authWithCache, validate(favouriteFollowSchema), async (req, res) => {
  const { user } = req
  const { page, lat, long } = req.query

  const PAGE = Number(page)
  const LAT = Number(lat)
  const LONG = Number(long)

  try {
    const favourites = await DB.CGetFavourites(user, PAGE, LAT, LONG)
    return res.json({ nextCursor: favourites.length < FEED_LIMIT ? null : PAGE + 1, deals: favourites })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
