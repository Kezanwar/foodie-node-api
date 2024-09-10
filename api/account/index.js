import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authNoCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { patchProfileSchema } from '#app/validation/account/account.js'

import Redis from '#app/services/cache/redis.js'
import Err from '#app/services/error/index.js'
import Resp from '#app/services/response/index.js'

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
    await Promise.all([user.save(), Redis.setUserByID(user)])
    Resp.json(req, res, user.toClient())
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
