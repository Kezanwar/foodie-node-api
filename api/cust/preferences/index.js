import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import Err from '#app/services/error/index.js'
import { Redis } from '#app/server.js'

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
  try {
    const user = req.user
    const { cuisines, dietary_requirements } = req.body
    user.preferences.cuisines = cuisines
    user.preferences.dietary_requirements = dietary_requirements
    await Promise.all([user.save(), Redis.setUserByID(user)])
    return res.json({ preferences: user.preferences })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
