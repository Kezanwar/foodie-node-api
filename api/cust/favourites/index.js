import { Router } from 'express'

import Deal from '#app/models/Deal.js'
import User from '#app/models/User.js'

import { authWithCache, authWithFavFollow } from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import { favouriteDealSchema } from '#app/validation/customer/deal.js'

import { SendError, throwErr } from '#app/utilities/error.js'
import { Redis } from '#app/server.js'

const router = Router()

router.post('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req

  try {
    if (!deal_id || !location_id) throwErr('Deal/Location ID not passed', 401)

    const newDealFavourite = { user: user._id, location_id }

    const updateDeal = await Deal.updateOne(
      {
        _id: deal_id,
      },
      { $addToSet: { favourites: newDealFavourite } }
    )

    if (!updateDeal.modifiedCount) {
      throwErr('Deal not found or you have already favourited this deal', 401)
    }

    const newUserFavourite = { deal: deal_id, location_id }

    const userProm = User.updateOne(
      {
        _id: req.user._id,
      },
      { $addToSet: { favourites: newUserFavourite } }
    )

    await Promise.all([userProm, Redis.removeUserByID(user)])

    return res.json({ deal_id, location_id, is_favourited: true })
  } catch (error) {
    SendError(res, error)
  }
})

router.patch('/', authWithCache, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req
  try {
    if (!deal_id || !location_id) throwErr('Deal/Location ID not passed', 401)

    const dealProm = Deal.updateOne({ _id: deal_id }, { $pull: { favourites: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: req.user._id }, { $pull: { favourites: { deal: deal_id, location_id } } })

    await Promise.all([dealProm, userProm, Redis.removeUserByID(user)])

    return res.json({ deal_id, location_id, is_favourited: false })
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/', authWithFavFollow, async (req, res) => {
  const {
    results: { following, favourites },
  } = req
  try {
    return res.json({ following, favourites })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
