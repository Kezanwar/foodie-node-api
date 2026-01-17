import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { regularFeedSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'

import { FEED_LIMIT } from '#app/constants/deals.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import FeedRepo from '#app/repositories/feed/index.js'

class DealFeedResponse extends HttpResponse {
  constructor(results, page) {
    super()
    this.results = results
    this.page = page
  }

  buildResponse() {
    return {
      nextCursor: this.results.length < FEED_LIMIT ? null : this.page + 1,
      deals: this.results,
    }
  }
}

class LocationFeedResponse extends HttpResponse {
  constructor(results, page) {
    super()
    this.results = results
    this.page = page
  }

  buildResponse() {
    return {
      nextCursor: this.results.length < FEED_LIMIT ? null : this.page + 1,
      locations: this.results,
    }
  }
}

router.get('/', validate(regularFeedSchema), authWithCache, async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
    user,
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)
    const PAGE = page ? Number(page) : 0

    const results = await FeedRepo.GetDealFeed(PAGE, LONG, LAT, cuisines, dietary_requirements)

    return Resp.json(req, res, new DealFeedResponse(results, PAGE))
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/guest', validate(regularFeedSchema), async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)
    const PAGE = page ? Number(page) : 0

    const results = await FeedRepo.GetLocationFeed(PAGE, LONG, LAT, cuisines, dietary_requirements)

    return Resp.json(req, res, new LocationFeedResponse(results, PAGE))
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/home', validate(regularFeedSchema), authWithCache, async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)
    const PAGE = page ? Number(page) : 0

    const results = await FeedRepo.GetLocationFeed(PAGE, LONG, LAT, cuisines, dietary_requirements)

    return Resp.json(req, res, new LocationFeedResponse(results, PAGE))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
