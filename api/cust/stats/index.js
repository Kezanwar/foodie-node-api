import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Stats from '#app/services/stats/index.js'

import validate from '#app/middleware/validate.js'
import { recentlyViewedSchema } from '#app/validation/customer/stats.js'

router.post('/recently-viewed', validate(recentlyViewedSchema), authWithCache, async (req, res) => {
  const {
    body: { recently_viewed },
    user,
  } = req

  try {
    Stats.emitCacheNewRecentlyViewed(recently_viewed, user)
    res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
