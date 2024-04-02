import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Deal from '#app/models/Deal.js'
import Location from '#app/models/Location.js'

import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '#app/constants/restaurant.js'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'

import { addLocationSchema, checkLocationSchema } from '#app/validation/restaurant/locations.js'

import { findRestaurantsLocations, getLongLat, getTimezone } from '#app/utilities/locations.js'
import { allCapsNoSpace } from '#app/utilities/strings.js'
import Err from '#app/services/error/index.js'
import { getID, makeMongoIDs, removeDocumentValues } from '#app/utilities/document.js'

import WorkerService from '#app/services/worker/index.js'

//* route POST api/locations/check
//? @desc send a location to this endpoint and receive lat / long back for user to check
//! @access authenticated & restaurant role super admin

router.post(
  '/check',
  authWithCache,
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

      if (alreadyExists) Err.throw(`Error: A Location already exists for ${address.postcode} `, 401)

      const long_lat = await getLongLat(address)
      if (!long_lat)
        Err.throw(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )

      res.status(200).json({ long_lat })
    } catch (error) {
      Err.send(res, error)
    }
  }
)

router.post(
  '/add',
  authWithCache,
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

      if (alreadyExists) Err.throw(`Error: A Location already exists for ${address.postcode} `, 401)

      const timezone = await getTimezone(long_lat)

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await WorkerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await WorkerService.call({
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
          bio: restaurant.bio,
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
      Err.send(res, error)
    }
  }
)

router.post(
  '/delete/:id',
  authWithCache,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { getLocations: true }),
  async (req, res) => {
    const {
      restaurant,
      locations,
      params: { id },
    } = req
    try {
      if (!id) Err.throw('Location ID is required', 401)

      const rLocToDelete = locations.find((rl) => getID(rl) === id)

      if (!rLocToDelete) Err.throw('Location not found', 401)

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
      Err.send(res, error)
    }
  }
)

router.post(
  '/edit/check/:id',
  authWithCache,
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

      if (alreadyExists) Err.throw(`Error: A Location already exists for ${address.postcode}`, 401)

      const editLocation = locations.find((l) => getID(l) === id)

      if (!editLocation) {
        Err.throw('Error: No location found')
        return
      }

      const long_lat = await getLongLat(address)

      if (!long_lat)
        Err.throw(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )

      res.status(200).json({ long_lat })
    } catch (error) {
      Err.send(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  authWithCache,
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
        Err.throw('Error: No ID found')
        return
      }

      const alreadyExists = locations.some(
        (l) => getID(l) !== id && allCapsNoSpace(l.address.postcode) === allCapsNoSpace(address.postcode)
      )

      if (alreadyExists) Err.throw(`Error: A Location already exists for ${address.postcode}`, 401)

      const editLocation = locations.find((l) => getID(l) === id)

      if (!editLocation) {
        Err.throw('Error: No location found')
        return
      }

      // update location

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await WorkerService.call({
          name: 'findCountryPhoneCode',
          params: [address.country],
        })
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await WorkerService.call({
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
          arrayFilters: [{ 'loc.location_id': makeMongoIDs(id) }],
        }
      )

      await Promise.all([EDIT_LOCATION, UPDATE_DEALS])

      const newLocs = await findRestaurantsLocations(restaurant._id)

      res.status(200).json(newLocs)
    } catch (error) {
      Err.send(res, error)
    }
  }
)

router.get('/', authWithCache, restRoleGuard(RESTAURANT_ROLES.USER, { getLocations: true }), async (req, res) => {
  const { locations } = req
  try {
    res.status(200).json(locations)
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
