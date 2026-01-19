import { Router } from 'express'
const router = Router()

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import AuthRepo from '#app/repositories/auth/index.js'

class PreferencesResponse extends HttpResponse {
  constructor(preferences) {
    super()
    this.preferences = preferences
  }

  buildResponse() {
    return {
      preferences: this.preferences,
    }
  }
}

router.get('/', authWithCache, async (req, res) => {
  try {
    const user = req.user
    return Resp.json(req, res, new PreferencesResponse(user.preferences))
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.post('/add', authNoCache, async (req, res) => {
  const user = req.user
  const { cuisines, dietary_requirements } = req.body

  try {
    const userProm = AuthRepo.UpdateUser(user, {
      preferences: {
        cuisines,
        dietary_requirements,
      },
    })

    await Promise.all([userProm, Redis.setUserByID(user)])

    return Resp.json(req, res, new PreferencesResponse(user.preferences))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
