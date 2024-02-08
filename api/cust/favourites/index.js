import { Router } from 'express'

import Deal from '#app/models/Deal.js'
import User from '#app/models/User.js'

import auth from '#app/middleware/auth.js'
import validate from '#app/middleware/validation.js'

import { favouriteDealSchema } from '#app/validation/customer/deal.js'

import { SendError, throwErr } from '#app/utilities/error.js'

const router = Router()

router.post('/', auth, validate(favouriteDealSchema), async (req, res) => {
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
        $and: [
          { '$favourites.user': { $ne: newDealFavourite.user } },
          { '$favourites.location_id': { $ne: newDealFavourite.location_id } },
        ],
      },
      { $addToSet: { favourites: { user: user._id, location_id } } }
    )

    if (!updateDeal.modifiedCount) {
      throwErr('Deal not found or you have already favourited this deal', 401)
    }

    const newUserFavourite = { deal: deal_id, location_id }

    await User.updateOne(
      {
        _id: req.user._id,
        $and: [
          { '$favourites.deal': { $ne: newUserFavourite.deal } },
          { '$favourites.location_id': { $ne: newUserFavourite.location_id } },
        ],
      },
      { $addToSet: { favourites: { deal: deal_id, location_id } } }
    )

    return res.json({ deal_id, location_id, is_favourited: true })
  } catch (error) {
    SendError(res, error)
  }
})

router.patch('/', auth, validate(favouriteDealSchema), async (req, res) => {
  const {
    body: { location_id, deal_id },
    user,
  } = req
  try {
    if (!deal_id || !location_id) throwErr('Deal/Location ID not passed', 401)

    const dealProm = Deal.updateOne({ _id: deal_id }, { $pull: { favourites: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: req.user._id }, { $pull: { favourites: { deal: deal_id, location_id } } })

    await Promise.all([dealProm, userProm])

    return res.json({ deal_id, location_id, is_favourited: false })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
