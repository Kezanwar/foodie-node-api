import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Task from '#app/services/worker/index.js'

dotenv.config()

router.get('/:id', authWithCache, async (req, res) => {
  const user = req.user
  const id = req.params?.id

  try {
    if (!DB.isValidID(id)) {
      Err.throw('Restaurant not found', 404)
    }

    const location = await DB.CGetSingleRestaurantLocation(id)

    if (!location.length) {
      Err.throw('Restaurant not found', 404)
    }

    const resp = await Task.checkSingleRestaurantFollowAndFav(user, location[0])

    res.json(resp)
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
