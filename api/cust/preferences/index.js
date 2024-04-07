import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'

dotenv.config()

router.get('/', authWithCache, async (req, res) => {
  try {
    const user = req.user
    return res.json({ preferences: user.preferences })
  } catch (error) {
    Err.send(res, error)
  }
})

router.post('/add', authNoCache, async (req, res) => {
  const user = req.user
  const { cuisines, dietary_requirements } = req.body

  try {
    const userProm = DB.updateUser(user, {
      preferences: {
        cuisines,
        dietary_requirements,
      },
    })

    await Promise.all([userProm, Redis.setUserByID(user)])

    return res.json({ preferences: user.preferences })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
