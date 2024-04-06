import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

import { FEED_LIMIT } from '#app/constants/deals.js'

router.get('/', authWithCache, async (req, res) => {
  const {
    query: { page, long, lat, cuisines, dietary_requirements },
    user,
  } = req

  try {
    if (!long || !lat) Err.throw('No coordinates', 400)

    const LONG = Number(long)
    const LAT = Number(lat)
    const PAGE = page ? Number(page) : 0

    for (let n of [LONG, LAT, PAGE]) {
      if (isNaN(n)) Err.throw('You must pass a number for Page, Long and Lat')
    }

    const results = await DB.CGetFeed(user, PAGE, LONG, LAT, cuisines, dietary_requirements)

    return res.json({ nextCursor: results.length < FEED_LIMIT ? null : PAGE + 1, deals: results })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
