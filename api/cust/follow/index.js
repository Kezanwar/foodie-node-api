import { Router } from 'express'
const router = Router()

import auth from '../../../middleware/auth.js'

import User from '../../../models/User.js'
import Restaurant from '../../../models/Restaurant.js'

import { SendError, throwErr } from '../../../utilities/error.js'

import validate from '../../../middleware/validation.js'
import { followRestSchema } from '../../../validation/customer/follow.js'

router.post('/', validate(followRestSchema), auth, async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  console.log('follow')
  try {
    const newRestFollower = { user: user._id, location_id }

    const updateDeal = await Restaurant.updateOne(
      {
        _id: rest_id,
        $and: [
          { '$favourites.user': { $ne: newRestFollower.user } },
          { '$favourites.location_id': { $ne: newRestFollower.location_id } },
        ],
      },
      { $addToSet: { followers: { user: user._id, location_id } } }
    )

    if (!updateDeal.modifiedCount) {
      throwErr('Restaurant not found or you already follow this restaurant', 401)
    }

    const newUserFollower = { restaurant: rest_id, location_id }

    await User.updateOne(
      {
        _id: req.user._id,
        $and: [
          { '$following.restaurant': { $ne: newUserFollower.restaurant } },
          { '$following.location_id': { $ne: newUserFollower.location_id } },
        ],
      },
      { $addToSet: { following: { restaurant: rest_id, location_id } } }
    )

    return res.json({ rest_id, location_id, is_following: true })
  } catch (error) {
    SendError(res, error)
  }
})

router.patch('/', auth, validate(followRestSchema), async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  console.log('unfollow')

  try {
    const restProm = Restaurant.updateOne({ _id: rest_id }, { $pull: { followers: { user: user._id, location_id } } })
    const userProm = User.updateOne({ _id: user._id }, { $pull: { following: { restaurant: rest_id, location_id } } })

    await Promise.all([restProm, userProm])

    return res.json({ rest_id, location_id, is_following: false })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
