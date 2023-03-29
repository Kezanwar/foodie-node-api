import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { SendError } from '../../utilities/utilities.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.get('/', auth, async (req, res) => {
  const { user } = req

  try {
    if (!user?.restaurant) return res.status(200).json({})

    const uRest = await Restaurant.findById(user?.restaurant?.id)

    if (!uRest) return res.status(200).json({})

    // await fakeLongLoadPromise()
    return res.status(200).json(uRest.toClient())
  } catch (error) {
    SendError(res, error)
  }
})

export default router
