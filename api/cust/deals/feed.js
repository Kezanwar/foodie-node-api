import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { regularFeedSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

import { FEED_LIMIT } from '#app/constants/deals.js'
import Resp from '#app/services/response/index.js'

router.get('/', validate(regularFeedSchema), authWithCache, async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
    user,
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)
    const PAGE = page ? Number(page) : 0

    const results = await DB.CGetFeed(user, PAGE, LONG, LAT, cuisines, dietary_requirements)

    return Resp.json(req, res, { nextCursor: results.length < FEED_LIMIT ? null : PAGE + 1, deals: results })
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
