import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import { companyInfoSchema } from '../../../validation/create-restaurant.validation.js'

import { SendError } from '../../utilities/utilities.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.post('/company-info', auth, validate(companyInfoSchema), async (req, res) => {
  const { company_name, company_number, company_address } = req.body
  try {
    const user = req.user

    let uRest = user?.restaurant
    let uRestID = uRest?.id
    let uRole = uRest?.role

    const company_info = {
      company_name,
      company_number,
      company_address,
    }

    if (!uRest || !uRestID || !uRole) {
      // user has no restaurant yet, first time hitting this step
      const newRest = new Restaurant({
        company_info,
        super_admin: user.id,
        registration_step: RESTAURANT_REG_STEPS.STEP_1_COMPLETE,
        status: RESTAURANT_STATUS.APPLICATION_PENDING,
      })
      await newRest.save()

      user.restaurant = { id: newRest.id, role: RESTAURANT_ROLES.SUPER_ADMIN }
      await user.save()

      res.status(200).json(newRest)
    } else {
      // user has a restaurant
      const currentRest = await Restaurant.findById(uRestID).select('-id')
      if (currentRest) currentRest.company_info = company_info
      await currentRest.save()
      res.status(200).json(currentRest)
    }
  } catch (error) {
    SendError(res, error)
  }
})

export default router
