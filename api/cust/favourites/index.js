import { Router } from 'express'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { favouriteDealSchema, favouriteFollowSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'
import { FEED_LIMIT } from '#app/constants/deals.js'
import Task from '#app/services/worker/index.js'
import Resp from '#app/services/response/index.js'

const router = Router()

router.post('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req

  try {
    if (await Task.userHasFavouritedDeal(user, deal_id, location_id)) {
      Err.throw('You already favourited this deal', 401)
    }

    await Promise.all([DB.CFavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, { deal_id, location_id, is_favourited: true })
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.patch('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req
  try {
    if (!(await Task.userHasFavouritedDeal(user, deal_id, location_id))) {
      Err.throw('You already dont have this deal favourited', 401)
    }

    await Promise.all([DB.CUnfavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, { deal_id, location_id, is_favourited: false })
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/', authWithCache, validate(favouriteFollowSchema), async (req, res) => {
  const { user } = req
  const { page } = req.query

  const PAGE = Number(page)

  try {
    const favourites = await DB.CGetFavourites(user, PAGE)
    return Resp.json(req, res, { nextCursor: favourites.length < FEED_LIMIT ? null : PAGE + 1, deals: favourites })
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
