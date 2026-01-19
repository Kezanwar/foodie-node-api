import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import LocationRepo from '#app/repositories/location/index.js'
import RepoUtil from '#app/repositories/util.js'

class LocationCustomerViewResponse extends HttpResponse {
  constructor(location) {
    super()
    this.location = location
  }

  buildResponse() {
    return this.location
  }
}

router.get('/:id', authWithCache, async (req, res) => {
  const id = req.params?.id

  try {
    if (!RepoUtil.isValidID(id)) {
      Err.throw('Restaurant not found', 404)
    }

    const location = await LocationRepo.GetCustomerViewLocation(id)

    if (!location) {
      Err.throw('Restaurant not found', 404)
    }

    if (!Permissions.isSubscribed(location?.restaurant.is_subscribed)) {
      Err.throw(`${location.restaurant.name} isn't subscribed anymore`, 404)
    }

    Resp.json(req, res, new LocationCustomerViewResponse(location))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
