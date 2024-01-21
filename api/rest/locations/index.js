import { Router } from 'express'
import mongoose from 'mongoose'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Deal from '../../../models/Deal.js'
import Location from '../../../models/Location.js'

import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.js'
import validate from '../../../middleware/validation.js'
import restRoleGuard from '../../../middleware/rest-role-guard.js'

import { addLocationSchema, checkLocationSchema } from '../../../validation/restaurant/locations.js'

import { findRestaurantsLocations, getLongLat, getTimezone } from '../../../utilities/locations.js'
import { allCapsNoSpace } from '../../../utilities/strings.js'
import { SendError, throwErr } from '../../../utilities/error.js'
import { getID, removeDocumentValues } from '../../../utilities/document.js'

import { workerService } from '../../../services/worker/index.js'

//* route POST api/locations/check
//? @desc send a location to this endpoint and receive lat / long back for user to check
//! @access authenticated & restaurant role super admin

router.post(
  '/check',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      locations,
      body: { address },
    } = req

    try {
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
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  validate(addLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      locations,
      body: { nickname, address, phone_number, email, opening_times, long_lat },
    } = req
    try {
      const alreadyExists = locations?.some(
        (l) => allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode} `, 401)

      const timezone = await getTimezone(long_lat)

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await workerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await workerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        const restOfNumber = phone_number.substring(1)
        phoneWithCode = `${code}${restOfNumber}`
      }

      const newLocation = new Location({
        nickname,
        address,
        phone_number: phoneWithCode,
        email,
        opening_times,
        geometry: { coordinates: [long_lat.long, long_lat.lat] },
        timezone,
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          avatar: restaurant.avatar,
          cover_photo: restaurant.cover_photo,
        },
        cuisines: restaurant.cuisines,
        dietary_requirements: restaurant.dietary_requirements,
      })

      await newLocation.save()

      res
        .status(200)
        .json([
          ...locations,
          removeDocumentValues(['cuisines', 'dietary_requirements', 'restaurant', 'active_deals'], newLocation),
        ])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post(
  '/delete/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  async (req, res) => {
    const {
      restaurant,
      locations,
      params: { id },
    } = req
    try {
      if (!id) throwErr('Location ID is required', 401)

      const rLocToDelete = locations.find((rl) => getID(rl) === id)

      if (!rLocToDelete) throwErr('Location not found', 401)

      await Location.deleteOne({ _id: id })

      if (locations.length === 1) {
        if (restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_3_COMPLETE) {
          restaurant.registration_step = RESTAURANT_REG_STEPS.STEP_2_COMPLETE
        }
      }

      await Promise.all([
        restaurant.save(),
        Deal.updateMany(
          {
            'restaurant.id': restaurant._id,
          },
          {
            $pull: {
              locations: { location_id: id },
            },
          }
        ),
      ])

      res.status(200).json([...locations.filter((rl) => getID(rl) !== id)])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post(
  '/edit/check/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      locations,
      body: { address },
      params: { id },
    } = req
    try {
      const alreadyExists = locations.some(
        (l) => getID(l) !== id && allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode}`, 401)

      const editLocation = locations.find((l) => getID(l) === id)

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
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  validate(addLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      locations,
      body: { nickname, address, phone_number, email, opening_times, long_lat },
      params: { id },
    } = req
    try {
      if (!id) {
        throwErr('Error: No ID found')
        return
      }

      const alreadyExists = locations.some(
        (l) => getID(l) !== id && allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) throwErr(`Error: A Location already exists for ${address.postcode}`, 401)

      const editLocation = locations.find((l) => getID(l) === id)

      if (!editLocation) {
        throwErr('Error: No location found')
        return
      }

      // update location

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await workerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await workerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        const restOfNumber = phone_number.substring(1)
        phoneWithCode = `${code}${restOfNumber}`
      }

      const EDIT_LOCATION = Location.updateOne(
        { 'restaurant.id': restaurant._id, _id: id },
        {
          $set: {
            nickname: nickname,
            address: address,
            phone_number: phoneWithCode,
            email: email,
            opening_times: opening_times,
            geometry: { coordinates: [long_lat.long, long_lat.lat] },
          },
        }
      )

      const UPDATE_DEALS = Deal.updateMany(
        {
          'restaurant.id': restaurant._id,
        },
        {
          $set: {
            'locations.$[loc].nickname': nickname,
            'locations.$[loc].geometry': { coordinates: [long_lat.long, long_lat.lat] },
          },
        },
        {
          arrayFilters: [{ 'loc.location_id': mongoose.Types.ObjectId(id) }],
        }
      )

      await Promise.all([EDIT_LOCATION, UPDATE_DEALS])

      const newLocs = await findRestaurantsLocations(restaurant._id)

      res.status(200).json(newLocs)
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.get('/', auth, restRoleGuard(RESTAURANT_ROLES.USER, { getLocations: true }), async (req, res) => {
  const { locations } = req
  try {
    res.status(200).json(locations)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
