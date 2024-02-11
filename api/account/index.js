import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import auth from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import { patchProfileSchema } from '#app/validation/account/account.js'

import { SendError } from '#app/utilities/error.js'

//* route PATCH api/account/profile
//? @desc update first/last name
//! @access auth

router.patch('/profile', auth, validate(patchProfileSchema), async (req, res) => {
  const {
    user,
    body: { first_name, last_name },
  } = req
  try {
    user.first_name = first_name
    user.last_name = last_name
    await user.save()
    res.json(user.toClient())
  } catch (error) {
    SendError(res, error)
  }
})

export default router
