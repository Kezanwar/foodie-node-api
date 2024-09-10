import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Stats from '#app/services/stats/index.js'

import validate from '#app/middleware/validate.js'
import { syncStatSchema } from '#app/validation/customer/stats.js'
import Resp from '#app/services/response/index.js'

router.post('/', validate(syncStatSchema), authWithCache, async (req, res) => {
  const {
    body: { stats },
    user,
  } = req

  try {
    Stats.emitSyncAppUserStatsEvent(stats, user)
    Resp.json(req, res, 'success')
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
