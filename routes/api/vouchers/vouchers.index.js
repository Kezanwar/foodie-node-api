import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import validate from '../../../middleware/validation.middleware.js'

import { SendError, getID, throwErr } from '../../utilities/utilities.js'
import { addVoucherSchema } from '../../../validation/vouchers.validation.js'
import Voucher from '../../../models/Voucher.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), async (req, res) => {
  const { user, restaurant } = req
  try {
    const vouchers = await Voucher.find({ 'restaurant.id': getID(restaurant) })
    res.json(vouchers)
  } catch (error) {
    SendError(res, error)
  }
})

router.post('/add', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), validate(addVoucherSchema), async (req, res) => {
  const {
    restaurant,
    body: { start_date, end_date, name, description, locations },
  } = req

  try {
    const locationsMap = locations
      .map((id) => {
        const mappedLoc = restaurant.locations.find((rL) => getID(rL) === id)
        return mappedLoc ? { id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
      })
      .filter(Boolean)

    const voucher = new Voucher({
      start_date,
      end_date,
      name,
      description,
      locations: locationsMap,
      restaurant: { id: restaurant._id, name: restaurant.name },
      is_expired: false,
    })
    await voucher.save()
    return res.status(200).json(voucher)
  } catch (error) {
    SendError(res, error)
  }
})

router.post('/delete/:id', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), async (req, res) => {
  const {
    restaurant,
    params: { id },
  } = req

  try {
    const voucher = await Voucher.findById(id)
    if (!voucher) throwErr('Voucher not found', 400)
    if (getID(voucher.restaurant) !== getID(restaurant)) throwErr('Unauthorized to delete this voucher', 400)
    await voucher.delete()
    return res.status(200).json('Success')
  } catch (error) {
    SendError(res, error)
  }
})

export default router
