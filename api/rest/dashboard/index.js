import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import { authWithCache } from '#app/middleware/auth.js'

import { RESTAURANT_ROLES } from '#app/constants/restaurant.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get(
  '/overview',
  authWithCache,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      query: { current_date },
    } = req

    let currentDate = current_date ? new Date(current_date) : new Date()

    try {
      const active_deals_prom = DB.RGetActiveDealsCount(restaurant._id, currentDate)

      const expired_deals_prom = DB.RGetExpiredDealsCount(restaurant._id, currentDate)

      const impressions_views_favourites_prom = DB.RGetRestaurantImpressionsViewFavouritesStats(restaurant._id)

      const locationsProm = DB.RGetRestaurantLocationsCount(restaurant._id)

      const followerProm = DB.RGetTotalRestaurantFollowersCount(restaurant._id)

      const [active_deals, expired_deals, impressions_views_favourites, locations, followers] = await Promise.all([
        active_deals_prom,
        expired_deals_prom,
        impressions_views_favourites_prom,
        locationsProm,
        followerProm,
      ])

      const booking_clicks = restaurant?.booking_clicks?.length || 0

      return res
        .status(200)
        .json({ active_deals, expired_deals, impressions_views_favourites, booking_clicks, followers, locations })
    } catch (error) {
      Err.send(res, error)
    }
  }
)

export default router
