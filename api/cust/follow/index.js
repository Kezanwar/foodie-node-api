import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'

import validate from '#app/middleware/validate.js'
import { followRestSchema } from '#app/validation/customer/follow.js'
import { favouriteFollowSchema } from '#app/validation/customer/deal.js'
import { FEED_LIMIT } from '#app/constants/deals.js'
import Task from '#app/services/worker/index.js'

router.post('/', validate(followRestSchema), authWithCache, async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  try {
    if (await Task.userFollowsRestaurant(user, location_id)) {
      Err.throw('You already follow this restaurant', 401)
    }

    await Promise.all([DB.CFollowOneRestauarant(user, location_id), Redis.removeUserByID(user)])

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
    if (!(await Task.userFollowsRestaurant(user, location_id))) {
      Err.throw('You arent following this restaurant', 401)
    }

    await Promise.all([DB.CUnfollowOneRestaurant(user, location_id), Redis.removeUserByID(user)])

    return res.json({ rest_id, location_id, is_following: false })
  } catch (error) {
    Err.send(res, error)
  }
})

router.get('/', authWithCache, validate(favouriteFollowSchema), async (req, res) => {
  const { user } = req
  const { page } = req.query

  const PAGE = Number(page)

  try {
    const following = await DB.CGetFollowing(user, PAGE)

    return res.json({ nextCursor: following.length < FEED_LIMIT ? null : PAGE + 1, restaurants: following })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
