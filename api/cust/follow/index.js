import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import User from '#app/models/User.js'
import Restaurant from '#app/models/Restaurant.js'

import { SendError, throwErr } from '#app/utilities/error.js'

import validate from '#app/middleware/validation.js'
import { followRestSchema } from '#app/validation/customer/follow.js'

router.post('/', validate(followRestSchema), authWithCache, async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

  try {
    const newRestFollower = { user: user._id, location_id }

    const updateDeal = await Restaurant.updateOne(
      {
        _id: rest_id,
      },
      { $addToSet: { followers: newRestFollower } }
    )

    if (!updateDeal.modifiedCount) {
      throwErr('Restaurant not found or you already follow this restaurant', 401)
    }

    const newUserFollower = { restaurant: rest_id, location_id }

    await User.updateOne(
      {
        _id: req.user._id,
      },
      { $addToSet: { following: newUserFollower } }
    )

    return res.json({ rest_id, location_id, is_following: true })
  } catch (error) {
    SendError(res, error)
  }
})

router.patch('/', authWithCache, validate(followRestSchema), async (req, res) => {
  const {
    body: { location_id, rest_id },
    user,
  } = req

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
