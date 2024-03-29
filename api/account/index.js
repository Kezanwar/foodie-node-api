import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authNoCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import { patchProfileSchema } from '#app/validation/account/account.js'

import { SendError } from '#app/utilities/error.js'
import { redis } from '#app/server.js'

//* route PATCH api/account/profile
//? @desc update first/last name
//! @access auth

router.patch('/profile', authNoCache, validate(patchProfileSchema), async (req, res) => {
  const {
    user,
    body: { first_name, last_name },
  } = req
  try {
    user.first_name = first_name
    user.last_name = last_name
    await Promise.all([user.save(), redis.setUserByID(user)])
    res.json(user.toClient())
  } catch (error) {
    SendError(res, error)
  }
})

export default router
