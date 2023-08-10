import { Router } from 'express'
import mongoose from 'mongoose'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { RESTAURANT_ROLES } from '../../../../constants/restaurant.js'
import { getID, SendError, throwErr } from '../../../utilities/utilities.js'

import auth from '../../../../middleware/auth.middleware.js'
import restRoleGuard from '../../../../middleware/rest-role-guard.middleware.js'

import Deal from '../../../../models/Deal.js'

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

    const impressions_views_saves_prom = Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
        },
      },

      {
        $addFields: {
          unique_views: {
            count: {
              $sum: {
                $size: { $setUnion: [[], '$views.users'] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          impressions: {
            $sum: '$unique_views',
          },
          views: {
            $sum: '$views.count',
          },
          saves: {
            $sum: '$saves.count',
          },
        },
      },
    ])

    const [active_deals, expired_deals, impressions_views_saves] = await Promise.all([
      active_deals_prom,
      expired_deals_prom,
      impressions_views_saves_prom,
    ])

    const booking_clicks = restaurant?.booking_clicks?.length || 0

    const favourites = restaurant?.favourites?.length || 0

    const locations = restaurant?.locations?.length || 0

    return res
      .status(200)
      .json({ active_deals, expired_deals, impressions_views_saves, booking_clicks, favourites, locations })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
