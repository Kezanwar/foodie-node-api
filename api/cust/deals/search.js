import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { searchFeedSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Task from '#app/services/worker/index.js'
import DB from '#app/services/db/index.js'
import { orderSearchDealsByTextMatchRelevance } from '#app/services/worker/tasks/deals.js'

router.get('/', authWithCache, validate(searchFeedSchema), async (req, res) => {
  const {
    query: { long, lat, text },
    user,
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    const results = await DB.CGetSearchFeed(user, LONG, LAT, text)

    // const sorted = await Task.orderSearchDealsByTextMatchRelevance(results, text)
    const sorted = orderSearchDealsByTextMatchRelevance(JSON.stringify(results), text)

    return res.json({ nextCursor: undefined, deals: sorted })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
