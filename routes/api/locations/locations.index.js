import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { addLocationSchema, checkLocationSchema } from '../../../validation/locations.validation.js'

import { allCapsNoSpace, getID, SendError, throwErr } from '../../utilities/utilities.js'

import { getLongLat, getTimezone } from '../../../services/location/location.services.js'

//* route POST api/locations/check
//? @desc send a location to this endpoint and receive lat / long back for user to check
//! @access authenticated & restaurant role super admin

router.post(
  '/check',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      body: { address },
    } = req
    try {
      const alreadyExists = restaurant?.locations.some(
        (l) => allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode} `, 401)

      const long_lat = await getLongLat(address)
      if (!long_lat)
        throwErr(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )

      res.status(200).json({ long_lat })
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
      body: { nickname, address, phone_number, email, opening_times, long_lat },
    } = req
    try {
      const alreadyExists = restaurant?.locations?.some(
        (l) => allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode} `, 401)

      const timezone = await getTimezone(long_lat)

      const newLocation = {
        nickname,
        address,
        phone_number,
        email,
        opening_times,
        geometry: { coordinates: [long_lat.long, long_lat.lat] },
        timezone,
      }

      restaurant.locations.push(newLocation)

      await restaurant.save()

      res.status(200).json(restaurant.locations)
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post('/delete/:id', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), async (req, res) => {
  const {
    restaurant,
    params: { id },
  } = req
  try {
    if (!id) throwErr('Location ID is required', 401)
    const rLocToDelete = restaurant.locations.find((rl) => getID(rl) === id)

    if (!rLocToDelete) throwErr('Location not found', 401)

    restaurant.locations = restaurant.locations.filter((rl) => getID(rl) !== id)

    if (restaurant.locations.length < 1) {
      if (restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_3_COMPLETE) {
        restaurant.registration_step = RESTAURANT_REG_STEPS.STEP_2_COMPLETE
      }
    }

    await restaurant.save()

    res.status(200).json(restaurant.locations)
  } catch (error) {
    SendError(res, error)
  }
})

router.post(
  '/edit/check/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      body: { address },
      params: { id },
    } = req
    try {
      const editLocation = restaurant?.locations?.find((l) => getID(l) === id)

      if (!editLocation) {
        throwErr('Error: No location found')
        return
      }

      const long_lat = await getLongLat(address)

      if (!long_lat)
        throwErr(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )

      res.status(200).json({ long_lat })
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  validate(addLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      body: { nickname, address, phone_number, email, opening_times, long_lat },
      params: { id },
    } = req
    try {
      if (!id) {
        throwErr('Error: No ID found')
        return
      }

      if (!restaurant?.locations?.length) {
        throwErr('Error: No location found')
        return
      }

      const editLocationIndex = restaurant?.locations?.findIndex((l) => getID(l) === id)

      if (editLocationIndex === -1) {
        throwErr('Error: No location found')
        return
      }
      const editLocation = restaurant?.locations[editLocationIndex]

      if (!editLocation) {
        throwErr('Error: No location found')
        return
      }

      restaurant.locations[editLocationIndex].nickname = nickname
      restaurant.locations[editLocationIndex].address = address
      restaurant.locations[editLocationIndex].phone_number = phone_number
      restaurant.locations[editLocationIndex].email = email
      restaurant.locations[editLocationIndex].opening_times = opening_times
      restaurant.locations[editLocationIndex].geometry = { coordinates: [long_lat.long, long_lat.lat] }

      await restaurant.save()

      res.status(200).json(restaurant.locations)
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.get('/all', auth, restRoleGuard(RESTAURANT_ROLES.USER), async (req, res) => {
  const { restaurant } = req
  try {
    res.status(200).json(restaurant.locations)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
