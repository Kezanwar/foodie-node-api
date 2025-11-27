import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Err from '#app/services/error/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse from '#app/services/response/http-response.js'
import StatsRepo from '#app/repositories/stats/index.js'

class DashboardOverviewResponse extends HttpResponse {
  constructor(overview) {
    super()
    this.overview = overview
  }

  buildResponse() {
    return this.overview
  }
}

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/overview', authWithCache, restRoleGuard(Permissions.EDIT, { acceptedOnly: true }), async (req, res) => {
  const { restaurant } = req

  try {
    const active_deals_count_prom = StatsRepo.GetActiveDealsCount(restaurant._id)

    const expired_deals_count_prom = StatsRepo.GetExpiredDealsCount(restaurant._id)

    const deal_stats_prom = StatsRepo.GetDealStats(restaurant._id)

    const locations_count_proms = StatsRepo.GetLocationsCount(restaurant._id)

    const location_stats_prom = StatsRepo.GetLocationStats(restaurant._id)

    const [active_deals_count, expired_deals_count, deal_stats, locations_count, location_stats] = await Promise.all([
      active_deals_count_prom,
      expired_deals_count_prom,
      deal_stats_prom,
      locations_count_proms,
      location_stats_prom,
    ])

    const overview = {
      deals: {
        active: active_deals_count,
        expired: expired_deals_count,
      },
      locations: locations_count,
      stats: {
        views: deal_stats.views_count + location_stats.views_count,
        favourites: deal_stats.favourites_count,
        booking_clicks: location_stats.booking_clicks_count,
        followers: location_stats.followers_count,
      },
    }

    return Resp.json(req, res, new DashboardOverviewResponse(overview))
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
