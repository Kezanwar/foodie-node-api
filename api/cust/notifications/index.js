import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'
import Err from '#app/services/error/index.js'

import Resp from '#app/services/response/index.js'
import { SuccessResponse } from '#app/services/response/http-response.js'
import Notifications from '#app/services/notifications/index.js'
import AuthRepo from '#app/repositories/auth/index.js'

router.post('/push-token', authWithCache, async (req, res) => {
  try {
    const user = req.user
    const { pushToken } = req.body

    if (!pushToken) {
      Err.throw('Missing push token', 400)
    }

    if (!Notifications.isValidPushToken(pushToken)) {
      Err.throw('Invalid push token', 400)
    }

    await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

    if (!user.push_tokens.includes(pushToken)) {
      await AuthRepo.SaveNewUserPushToken(user, pushToken)
    }

    return Resp.json(req, res, SuccessResponse)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
