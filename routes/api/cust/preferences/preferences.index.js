import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import auth from '../../../../middleware/auth.middleware.js'
import { SendError } from '../../../utilities/utilities.js'

dotenv.config()

router.get('/', auth, async (req, res) => {
  const user = req.user
  try {
    return res.json({ preferences: user.preferences })
  } catch (error) {
    SendError(res, error)
  }
})

router.post('/add', auth, async (req, res) => {
  const user = req.user
  const { cuisines, dietary_requirements } = req.body
  user.preferences.cuisines = cuisines
  user.preferences.dietary_requirements = dietary_requirements
  await user.save()
  try {
    return res.json({ preferences: user.preferences })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
