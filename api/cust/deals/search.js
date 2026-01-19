import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { searchFeedSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Task from '#app/services/worker/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import FeedRepo from '#app/repositories/feed/index.js'

class SearchFeedResponse extends HttpResponse {
  constructor(deals) {
    super()
    this.deals = deals
  }

  buildResponse() {
    return {
      nextCursor: undefined,
      deals: this.deals,
    }
  }
}

router.get('/', authWithCache, validate(searchFeedSchema), async (req, res) => {
  const {
    query: { long, lat, text },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    const results = await FeedRepo.GetSearchFeed(LONG, LAT, text)

    const sorted = await Task.orderSearchDealsByTextMatchRelevance(results, text)

    return Resp.json(req, res, new SearchFeedResponse(sorted))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
