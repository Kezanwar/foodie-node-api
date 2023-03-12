import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import { companyInfoSchema, restaurantDetailsSchema } from '../../../validation/create-restaurant.validation.js'

import { removeDocumentValues, SendError } from '../../utilities/utilities.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'

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

    if (!uRest) {
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

      return res.status(200).json(removeDocumentValues(['_id', 'super_admin', '__v'], newRest))
    } else {
      // user has a restaurant
      if ((uRest && !uRestID) || (uRest && !uRole)) {
        throw new Error('Unable to find Restaurant or User Permissions')
      }
      if (uRole !== RESTAURANT_ROLES.SUPER_ADMIN) throw new Error('Access denied')

      const currentRest = await Restaurant.findById(uRestID)

      if (!currentRest) throw new Error('Restaurant doesnt exist')

      if (currentRest) currentRest.company_info = company_info
      await currentRest.save()
      return res.status(200).json(removeDocumentValues(['_id', '__v'], currentRest))
    }
  } catch (error) {
    SendError(res, error)
  }
})

router.post(
  '/restaurant-details',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(restaurantDetailsSchema),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover_photo', maxCount: 1 },
  ]),
  async (req, res) => {
    const {
      body: { name, bio },
      restaurant,
      files,
    } = req

    console.log(files)
    try {
      return res.json('success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router
