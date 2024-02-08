import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import auth from '#app/middleware/auth.js'

import { SendError } from '#app/utilities/error.js'

//* route PATCH api/account/profile
//? @desc update first/last name
//! @access auth

router.patch('/profile', auth, async (req, res) => {
  try {
    console.log('block')
  } catch (error) {
    SendError(res, error)
  }
})

export default router
