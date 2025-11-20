import { Router } from 'express'

const router = Router()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'

import { addLocationSchema, checkLocationSchema } from '#app/validation/restaurant/locations.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Task from '#app/services/worker/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import LocationUtil from '#app/repositories/location/util.js'
import LocationRepo from '#app/repositories/location/index.js'
import RepoUtil from '#app/repositories/util.js'

function checkIfAddLocationAlreadyExists(locations, address) {
  return locations.some(
    (l) => LocationUtil.shortPostocde(l.address.postcode) === LocationUtil.shortPostocde(address.postcode)
  )
}

function findLocationToEdit(locations, id) {
  return locations.find((l) => RepoUtil.getID(l) === id)
}

function checkIfEditLocationAlreadyExists(locations, id, address) {
  return locations.some(
    (l) =>
      RepoUtil.getID(l) !== id &&
      LocationUtil.shortPostocde(l.address.postcode) === LocationUtil.shortPostocde(address.postcode)
  )
}

class LocationCheckResponse extends HttpResponse {
  constructor(long_lat) {
    super()
    this.long_lat = long_lat
  }

  buildResponse() {
    return { long_lat: this.long_lat }
  }
}

class GetLocationResponse extends HttpResponse {
  constructor(locations) {
    super()
    this.locations = locations
  }

  buildResponse() {
    return {
      locations: this.locations,
    }
  }
}

router.post(
  '/check',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      locations,
      body: { address },
    } = req

    try {
      const alreadyExists = checkIfAddLocationAlreadyExists(locations, address)

      if (alreadyExists) Err.throw(`Error: A Location already exists for ${address.postcode} `, 401)

      const long_lat = await LocationUtil.getLongLat(address)

      if (!long_lat) {
        Err.throw(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )
      }

      Resp.json(req, res, new LocationCheckResponse(long_lat))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post(
  '/add',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
  validate(addLocationSchema),
  async (req, res) => {
    const {
      restaurant,
      locations,
      body: { nickname, address, phone_number, email, opening_times, long_lat },
    } = req
    try {
      const alreadyExists = checkIfAddLocationAlreadyExists(locations, address)

      if (alreadyExists) {
        Err.throw(`Error: A Location already exists for ${address.postcode} `, 401)
      }

      const timezone = await LocationUtil.getTimezone(long_lat)

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await Task.findCountryPhoneCode(address.country)
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await Task.findCountryPhoneCode(address.country)
        const restOfNumber = phone_number.substring(1)
        phoneWithCode = `${code}${restOfNumber}`
      }

      const newLocation = await LocationRepo.CreateNew({
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
          is_subscribed: restaurant.is_subscribed,
        },
        cuisines: restaurant.cuisines,
        dietary_requirements: restaurant.dietary_requirements,
        active_deals: [],
      })

      const pruned = {
        _id: newLocation._id,
        nickname: newLocation.nickname,
        address: newLocation.address,
        phone_number: newLocation.phone_number,
        email: newLocation.email,
        opening_times: newLocation.opening_times,
        geometry: newLocation.geometry,
        timezone: newLocation.timezone,
        archived: newLocation.archived,
      }

      Resp.json(req, res, new GetLocationResponse([...locations, pruned]))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post('/delete/:id', authWithCache, restRoleGuard(Permissions.EDIT, { getLocations: true }), async (req, res) => {
  const {
    restaurant,
    locations,
    params: { id },
  } = req
  try {
    if (!id) {
      Err.throw('Location ID is required', 401)
    }

    const rLocToDelete = findLocationToEdit(locations, id)

    if (!rLocToDelete) {
      Err.throw('Location not found', 401)
    }

    if (locations.length === 1) {
      if (Permissions.isStep3Complete(restaurant.registration_step)) {
        await DB.RUpdateApplicationRestaurant(restaurant, { registration_step: Permissions.REG_STEP_2_COMPLETE })
      }
    }

    await LocationRepo.HardDeleteOne(restaurant._id, rLocToDelete._id)

    const updatedLocations = locations.filter((rl) => RepoUtil.getID(rl) !== id)

    Resp.json(req, res, new GetLocationResponse(updatedLocations))
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.post(
  '/archive/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
  async (req, res) => {
    const {
      restaurant,
      locations,
      params: { id },
    } = req
    try {
      if (!id) {
        Err.throw('Location ID is required', 401)
      }

      const rLocToArchive = findLocationToEdit(locations, id)

      if (!rLocToArchive) {
        Err.throw('Location not found', 401)
      }

      console.log(id)

      await LocationRepo.ArchiveOne(restaurant._id, rLocToArchive._id)

      const updatedLocations = locations.map((l) => {
        if (RepoUtil.getID(l) === id) {
          return { ...l, archived: !l.archived }
        }
        return l
      })

      console.log(updatedLocations)

      Resp.json(req, res, new GetLocationResponse(updatedLocations))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post(
  '/unarchive/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
  async (req, res) => {
    const {
      locations,
      params: { id },
    } = req
    try {
      if (!id) {
        Err.throw('Location ID is required', 401)
      }

      const rLocToUnArchive = findLocationToEdit(locations, id)

      if (!rLocToUnArchive) {
        Err.throw('Location not found', 401)
      }

      await LocationRepo.UnarchiveOne(rLocToUnArchive._id)

      const updatedLocations = locations.map((l) => {
        if (RepoUtil.getID(l) === id) {
          return { ...l, archived: !l.archived }
        }
        return l
      })

      Resp.json(req, res, new GetLocationResponse(updatedLocations))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post(
  '/edit/check/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
  validate(checkLocationSchema),
  async (req, res) => {
    const {
      locations,
      body: { address },
      params: { id },
    } = req
    try {
      const alreadyExists = checkIfEditLocationAlreadyExists(locations, id, address)

      if (alreadyExists) {
        Err.throw(`Error: A Location already exists for ${address.postcode}`, 401)
      }

      const editLocation = findLocationToEdit(locations, id)

      if (!editLocation) {
        Err.throw('Error: No location found')
        return
      }

      const long_lat = await LocationUtil.getLongLat(address)

      if (!long_lat) {
        Err.throw(
          'Error: Cannot find a geolocation for the location provided, please check the address and try again',
          422
        )
      }

      Resp.json(req, res, new LocationCheckResponse(long_lat))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { getLocations: true }),
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

      const alreadyExists = checkIfEditLocationAlreadyExists(locations, id, address)

      if (alreadyExists) {
        Err.throw(`Error: A Location already exists for ${address.postcode}`, 401)
      }

      const editLocation = findLocationToEdit(locations, id)

      if (!editLocation) {
        Err.throw('Error: No location found')
        return
      }

      // update location

      let phoneWithCode = phone_number

      const firstChar = phone_number.charAt(0)

      if (firstChar !== '+' && firstChar !== '0') {
        const code = await Task.findCountryPhoneCode(address.country)
        phoneWithCode = `${code}${phoneWithCode}`
      }

      if (firstChar === '0') {
        const code = await Task.findCountryPhoneCode(address.country)
        const restOfNumber = phone_number.substring(1)
        phoneWithCode = `${code}${restOfNumber}`
      }

      await LocationRepo.UpdateOne(restaurant._id, id, {
        nickname,
        address,
        phone_number: phoneWithCode,
        email,
        opening_times,
        long_lat,
      })

      const newLocs = await LocationRepo.GetAllLocations(restaurant._id)

      Resp.json(req, res, new GetLocationResponse(newLocs))
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.get('/', authWithCache, restRoleGuard(Permissions.EDIT, { getLocations: true }), async (req, res) => {
  const { locations } = req
  try {
    Resp.json(req, res, new GetLocationResponse(locations))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
