import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import validate from '../../../middleware/validation.middleware.js'

import { SendError, getID, throwErr } from '../../utilities/utilities.js'
import { addVoucherSchema, editVoucherSchema } from '../../../validation/vouchers.validation.js'
import Voucher from '../../../models/Voucher.js'
import { isInPastWithinTimezone } from '../../../services/date/date.services.js'
import { isBefore } from 'date-fns'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const { restaurant } = req
  try {
    const vouchers = await Voucher.find({ 'restaurant.id': getID(restaurant) })
    res.json(vouchers)
  } catch (error) {
    SendError(res, error)
  }
})

router.post(
  '/add',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(addVoucherSchema),
  async (req, res) => {
    const {
      restaurant,
      body: { start_date, end_date, name, description, locations, timezone },
    } = req

    try {
      const locationsMap = locations
        .map((id) => {
          const mappedLoc = restaurant.locations.find((rL) => getID(rL) === id && rL.timezone === timezone)
          return mappedLoc ? { id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
        })
        .filter(Boolean)

      if (!locationsMap?.length) throwErr('Error: No matching locations found', 400)

      const voucher = new Voucher({
        start_date,
        end_date,
        name,
        description,
        locations: locationsMap,
        restaurant: { id: restaurant._id, name: restaurant.name },
        dietary_requirements: restaurant.dietary_requirements,
        cuisines: restaurant.cuisines,
        is_expired: false,
        timezone,
      })
      await voucher.save()
      return res.status(200).json(voucher)
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(editVoucherSchema),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { name, description, end_date },
    } = req

    try {
      const voucher = await Voucher.findById(id)
      if (!voucher) throwErr('Voucher not found', 400)
      if (getID(voucher.restaurant) !== getID(restaurant)) throwErr('Unauthorized to edit this voucher', 400)
      if (isInPastWithinTimezone(end_date, voucher.timezone)) throwErr('Voucher end date cannot be in the past', 400)
      if (isBefore(new Date(end_date), new Date(voucher.start_date))) {
        throwErr('Voucher end date cannot be before the start date', 400)
      }
      voucher.name = name
      voucher.description = description
      voucher.end_date = end_date
      await voucher.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)
router.post(
  '/delete/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
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
  }
)

router.post(
  '/expire/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
    } = req

    try {
      const voucher = await Voucher.findById(id)
      if (!voucher) throwErr('Voucher not found', 400)
      if (getID(voucher.restaurant) !== getID(restaurant)) throwErr('Unauthorized to expire this voucher', 400)
      if (voucher.is_expired) throwErr('Voucher is already expired', 400)
      voucher.is_expired = true
      await voucher.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router
