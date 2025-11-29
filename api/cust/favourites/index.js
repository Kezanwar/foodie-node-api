import { Router } from 'express'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { favouriteDealSchema, favouriteFollowSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import { FEED_LIMIT } from '#app/constants/deals.js'
import Task from '#app/services/worker/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import DealRepo from '#app/repositories/deal/index.js'

class FavouriteStatusResponse extends HttpResponse {
  constructor(deal_id, location_id, is_favourited) {
    super()
    this.deal_id = deal_id
    this.location_id = location_id
    this.is_favourited = is_favourited
  }

  buildResponse() {
    return {
      deal_id: this.deal_id,
      location_id: this.location_id,
      is_favourited: this.is_favourited,
    }
  }
}

class FavouritesListResponse extends HttpResponse {
  constructor(favourites, page) {
    super()
    this.favourites = favourites
    this.page = page
  }

  buildResponse() {
    return {
      nextCursor: this.favourites.length < FEED_LIMIT ? null : this.page + 1,
      deals: this.favourites,
    }
  }
}

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

    await Promise.all([DealRepo.FavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, new FavouriteStatusResponse(deal_id, location_id, true))
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

    await Promise.all([DealRepo.UnfavouriteOneDeal(user, deal_id, location_id), Redis.removeUserByID(user)])

    return Resp.json(req, res, new FavouriteStatusResponse(deal_id, location_id, false))
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/', authWithCache, validate(favouriteFollowSchema), async (req, res) => {
  const { user } = req
  const { page } = req.query

  const PAGE = Number(page)

  try {
    const favourites = await DealRepo.GetFavourites(user, PAGE)
    return Resp.json(req, res, new FavouritesListResponse(favourites, PAGE))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
