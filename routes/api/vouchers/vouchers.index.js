import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import validate from '../../../middleware/validation.middleware.js'

import { SendError, throwErr } from '../../utilities/utilities.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), async (req, res) => {
  try {
    const user = req.user
    const currentRest = await Restaurant.findById(user.restaurant?.id)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
