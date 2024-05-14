import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import { singleDealSchema } from '#app/validation/customer/deal.js'

import Err from '#app/services/error/index.js'
import Task from '#app/services/worker/index.js'
import DB from '#app/services/db/index.js'

dotenv.config()

router.get('/', authWithCache, validate(singleDealSchema), async (req, res) => {
  const {
    user,
    query: { deal_id, location_id },
  } = req

  try {
    const dealProm = DB.CGetSingleDeal(deal_id, location_id)

    const followFavProm = Task.checkSingleDealFollowAndFav(user, deal_id, location_id)

    const [deal, followFav] = await Promise.all([dealProm, followFavProm])

    if (!deal.length) {
      Err.throw('Deal not found', 404)
    }

    deal[0].is_favourited = followFav.is_favourited
    deal[0].is_following = followFav.is_following

    res.json(deal[0])

    // TODO: Add a view to deal here after response has been sent using prom.then
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
