import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { addLocationSchema, checkLocationSchema } from '../../../validation/locations.validation.js'

import { allCapsNoSpace, getID, getLongLat, SendError, throwErr } from '../../utilities/utilities.js'
import Location from '../../../models/Location.js'

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
      const locations = await restaurant.getLocations()
      const alreadyExists = locations.some(
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
      const locations = await restaurant.getLocations()
      const alreadyExists = locations.some(
        (l) => allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode} `, 401)

      const { dietary_requirements, cuisines } = restaurant

      const newLocation = new Location({
        nickname,
        address,
        phone_number,
        email,
        opening_times,
        dietary_requirements,
        cuisines,
        geometry: { coordinates: [long_lat.long, long_lat.lat] },
        restaurant: restaurant._id,
      })

      await newLocation.save()

      restaurant.locations.push(newLocation._id)

      await restaurant.save()

      const resLocations = await restaurant.getLocations()

      res.status(200).json(resLocations)
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

    const locToDelete = await Location.findById(id)

    if (!locToDelete) throwErr('Location not found', 401)

    await locToDelete.remove()

    restaurant.locations = restaurant.locations.filter((rl) => getID(rl) !== id)

    await restaurant.save()

    const locRes = await restaurant.getLocations()

    res.status(200).json(locRes)
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
      body: { address },
      params: { id },
    } = req
    try {
      const editLocation = await Location.findById(id)

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

      const editLocation = await Location.findById(id)

      if (!editLocation) {
        throwErr('Error: No location found')
        return
      }

      const isRestaurantsLocation = getID(editLocation.restaurant) === getID(restaurant._id)

      if (!isRestaurantsLocation) {
        throwErr('Error: Location not owned by restaurant')
        return
      }

      await editLocation.updateLocation({ nickname, address, phone_number, email, opening_times, long_lat })

      const locations = await restaurant.getLocations()

      res.status(200).json(locations)
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
