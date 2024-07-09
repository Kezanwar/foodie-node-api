import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Stats from '#app/services/stats/index.js'

import validate from '#app/middleware/validate.js'
import { syncStatSchema } from '#app/validation/customer/stats.js'

router.post('/', validate(syncStatSchema), authWithCache, async (req, res) => {
  const {
    body: { stats },
    user,
  } = req

  try {
    Stats.emitSyncAppUserStatsEvent(stats, user)
    res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
