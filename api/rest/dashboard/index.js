import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_ROLES } from '#app/constants/restaurant.js'

import auth from '#app/middleware/auth.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Deal from '#app/models/Deal.js'
import Location from '#app/models/Location.js'

import { SendError } from '#app/utilities/error.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/overview', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    query: { current_date },
  } = req

  let currentDate = current_date ? new Date(current_date) : new Date()

  try {
    const active_deals_prom = Deal.count({
      'restaurant.id': restaurant._id,
      $or: [{ is_expired: false }, { end_date: { $gt: currentDate } }],
    })

    const expired_deals_prom = Deal.count({
      'restaurant.id': restaurant._id,
      $or: [{ is_expired: true }, { end_date: { $lte: currentDate } }],
    })

    const impressions_views_favourites_prom = Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
        },
      },

      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views'] },
            },
          },
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
        },
      },
      {
        $group: {
          _id: null,
          impressions: {
            $sum: '$unique_views',
          },
          views: { $sum: '$views' },
          favourites: { $sum: '$favourites' },
        },
      },
    ])

    const locationsProm = Location.count({ 'restaurant.id': restaurant._id })

    const [active_deals, expired_deals, impressions_views_favourites, locations] = await Promise.all([
      active_deals_prom,
      expired_deals_prom,
      impressions_views_favourites_prom,
      locationsProm,
    ])

    const booking_clicks = restaurant?.booking_clicks?.length || 0

    const followers = restaurant?.followers?.length || 0

    return res
      .status(200)
      .json({ active_deals, expired_deals, impressions_views_favourites, booking_clicks, followers, locations })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
