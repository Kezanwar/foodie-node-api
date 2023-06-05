import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import validate from '../../../middleware/validation.middleware.js'

import { SendError, getID, throwErr } from '../../utilities/utilities.js'
import { addDealSchema, editDealSchema } from '../../../validation/deals.validation.js'
import Deal from '../../../models/Deal.js'
import { isInPastWithinTimezone } from '../../../services/date/date.services.js'
import { isBefore } from 'date-fns'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const { restaurant } = req
  try {
    const deals = await Deal.find({ 'restaurant.id': getID(restaurant) })
    res.json(deals)
  } catch (error) {
    SendError(res, error)
  }
})

router.post(
  '/add',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(addDealSchema),
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

      const deal = new Deal({
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
      await deal.save()
      return res.status(200).json(deal)
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  validate(editDealSchema),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { name, description, end_date },
    } = req

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to edit this deal', 400)
      if (isInPastWithinTimezone(end_date, deal.timezone)) throwErr('Deal end date cannot be in the past', 400)
      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        throwErr('Deal end date cannot be before the start date', 400)
      }
      deal.name = name
      deal.description = description
      deal.end_date = end_date
      await deal.save()
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
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to delete this deal', 400)
      await deal.delete()
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
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to expire this deal', 400)
      if (deal.is_expired) throwErr('Deal is already expired', 400)
      deal.is_expired = true
      await deal.save()
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router
