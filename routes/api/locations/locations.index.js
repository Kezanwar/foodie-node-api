import { Router } from 'express'
import axios from 'axios'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { addLocationSchema, checkLocationSchema } from '../../../validation/locations.validation.js'

import { getLongLat, SendError, throwErr } from '../../utilities/utilities.js'
import Location from '../../../models/Location.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.post(
  '/check',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      body: { nickname, address, phone_number, email, opening_times },
    } = req
    try {
      const long_lat = await getLongLat(address)
      if (!long_lat)
        throwErr(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )
      res.status(200).json({ nickname, address, phone_number, email, opening_times, long_lat })
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post(
  '/add',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(addLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      user,
      body: { nickname, address, phone_number, email, opening_times, long_lat },
    } = req
    try {
      console.log(restaurant._id)

      const newLocation = new Location({
        nickname,
        address,
        phone_number,
        email,
        opening_times,
        long_lat,
        restaurant: restaurant._id,
      })

      await newLocation.save()

      restaurant.locations.push(newLocation._id)

      await restaurant.save()

      res.status(200).json(restaurant.toClient())
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.get('/all', auth, restRoleGuard(RESTAURANT_ROLES.USER), async (req, res) => {
  const { restaurant } = req
  try {
    const response = await restaurant.getLocations()
    res.status(200).json(response)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
