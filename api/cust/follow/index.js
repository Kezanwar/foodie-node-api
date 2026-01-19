import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'

import validate from '#app/middleware/validate.js'
import { followRestSchema } from '#app/validation/customer/follow.js'
import { favouriteFollowSchema } from '#app/validation/customer/deal.js'
import { FEED_LIMIT } from '#app/constants/deals.js'
import Resp from '#app/services/response/index.js'
import HttpResponse, { SuccessResponse } from '#app/services/response/http-response.js'
import LocationRepo from '#app/repositories/location/index.js'

class FollowingListResponse extends HttpResponse {
  constructor(following, page) {
    super()
    this.following = following
    this.page = page
  }

  buildResponse() {
    return {
      nextCursor: this.following.length < FEED_LIMIT ? null : this.page + 1,
      restaurants: this.following,
    }
  }
}

router.post('/', validate(followRestSchema), authWithCache, async (req, res) => {
  const {
    body: { location_id },
    user,
  } = req

  try {
    if (await LocationRepo.UserFollowsLocation(user._id, location_id)) {
      Err.throw('You already follow this restaurant', 401)
    }

    await Promise.all([LocationRepo.FollowLocation(user._id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, SuccessResponse)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.patch('/', authWithCache, validate(followRestSchema), async (req, res) => {
  const {
    body: { location_id },
    user,
  } = req

  try {
    if (!(await LocationRepo.UserFollowsLocation(user._id, location_id))) {
      Err.throw('You arent following this restaurant', 401)
    }

    await Promise.all([LocationRepo.UnfollowLocation(user._id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, SuccessResponse)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/', authWithCache, validate(favouriteFollowSchema), async (req, res) => {
  const { user } = req
  const { page } = req.query

  const PAGE = Number(page)

  try {
    const following = await LocationRepo.GetFollowing(user, PAGE)

    return Resp.json(req, res, new FollowingListResponse(following, PAGE))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
