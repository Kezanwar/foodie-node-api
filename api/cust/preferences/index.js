import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import auth from '#app/middleware/auth.js'
import { SendError } from '#app/utilities/error.js'

dotenv.config()

router.get('/', auth, async (req, res) => {
  try {
    const user = req.user
    return res.json({ preferences: user.preferences })
  } catch (error) {
    SendError(res, error)
  }
})

router.post('/add', auth, async (req, res) => {
  try {
    const user = req.user
    const { cuisines, dietary_requirements } = req.body
    user.preferences.cuisines = cuisines
    user.preferences.dietary_requirements = dietary_requirements
    await user.save()
    return res.json({ preferences: user.preferences })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
