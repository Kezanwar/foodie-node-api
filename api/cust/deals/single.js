import { Router } from 'express'
const router = Router()
import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'
import { singleDealSchema } from '#app/validation/customer/deal.js'
import Err from '#app/services/error/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import DealRepo from '#app/repositories/deal/index.js'

class SingleDealResponse extends HttpResponse {
  constructor(deal) {
    super()
    this.deal = deal
  }

  buildResponse() {
    return this.deal
  }
}

router.get('/', authWithCache, validate(singleDealSchema), async (req, res) => {
  const {
    query: { deal_id, location_id },
  } = req

  try {
    const deal = await DealRepo.GetCustomerViewSingleDeal(deal_id, location_id)

    if (!deal.length) {
      Err.throw('Deal not found', 404)
    }

    if (!Permissions.isSubscribed(deal[0].restaurant?.is_subscribed)) {
      Err.throw(`${deal[0].restaurant.name} isn't subscribed anymore`, 404)
    }

    Resp.json(req, res, new SingleDealResponse(deal[0]))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
