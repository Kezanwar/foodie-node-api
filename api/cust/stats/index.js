import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Loc from '#app/services/location/index.js'

import Redis from '#app/services/cache/redis.js'
import validate from '#app/middleware/validate.js'
import { recentlyViewedSchema } from '#app/validation/customer/stats.js'
import Stats from '#app/services/stats/index.js'

router.post('/recently-viewed', validate(recentlyViewedSchema), authWithCache, async (req, res) => {
  const {
    body: { recently_viewed },
    user,
  } = req

  try {
    Stats.emitCacheNewRecentlyViewed(recently_viewed, DB.getID(user))
    res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
