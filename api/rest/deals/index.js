import { Router } from 'express'

const router = Router()

import { isBefore } from 'date-fns'

// models
import Deal from '#app/models/Deal.js'

// middlewares
import { authWithCache } from '#app/middleware/auth.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'
import validate from '#app/middleware/validate.js'

// validations
import { addDealSchema, editDealSchema } from '#app/validation/restaurant/deals.js'

// services
import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Loc from '#app/services/location/index.js'
import Str from '#app/services/string/index.js'
import Notifications from '#app/services/notifications/index.js'
import Permissions from '#app/services/permissions/index.js'
import Resp from '#app/services/response/index.js'
import Redis from '#app/services/cache/redis.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/active', authWithCache, restRoleGuard(Permissions.EDIT, { acceptedOnly: true }), async (req, res) => {
  const { restaurant } = req
  try {
    const active_deals = await DB.RGetActiveDeals(restaurant._id)

    Resp.json(req, res, active_deals)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/expired', authWithCache, restRoleGuard(Permissions.EDIT, { acceptedOnly: true }), async (req, res) => {
  const { restaurant } = req
  try {
    const expired_deals = await DB.RGetExpiredDeals(restaurant._id)

    Resp.json(req, res, expired_deals)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/single/:id', authWithCache, restRoleGuard(Permissions.EDIT, { acceptedOnly: true }), async (req, res) => {
  const {
    params: { id },
    restaurant,
  } = req

  try {
    const deal = await DB.RGetSingleDealWithStatsByID(restaurant._id, id)

    if (!deal) {
      Err.throw('Deal not found', 402)
    }

    Resp.json(req, res, deal)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get(
  '/use-template/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true }),
  async (req, res) => {
    const {
      params: { id },
      restaurant,
    } = req

    try {
      const deal = await DB.RGetDealAsTemplateByID(restaurant._id, id)

      if (!deal) {
        Err.throw('Deal not found', 402)
      }

      Resp.json(req, res, deal)
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post(
  '/add',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true, getLocations: true }),
  validate(addDealSchema),
  async (req, res) => {
    const {
      user,
      restaurant,
      locations: restLocations,
      body: { start_date, end_date, name, description, locations },
    } = req

    try {
      const activeDealsCount = await DB.RGetActiveDealsCount(restaurant._id)

      const locationsCount = restLocations.length || 0

      const limit = !restaurant.is_subscribed
        ? 0
        : Permissions.getDealLimit(user.subscription.subscription_tier, locationsCount)

      if (activeDealsCount >= limit) {
        Err.throw('Maxmimum active deals limit reached', 402)
      }

      const newDealLocations = Loc.createAddDealLocations(restLocations, locations)

      if (!newDealLocations.length || locations.length !== newDealLocations.length) {
        Err.throw('Error: No matching locations found', 400)
      }

      const newDeal = new Deal({
        start_date,
        end_date,
        name: Str.capitalizeSentence(name).trim(),
        description: description.trim(),
        locations: newDealLocations,
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          avatar: restaurant.avatar,
          cover_photo: restaurant.cover_photo,
        },
        dietary_requirements: restaurant.dietary_requirements,
        cuisines: restaurant.cuisines,
        is_expired: false,
      })

      await DB.RCreateNewDeal(restaurant._id, newDeal, locations)

      Resp.json(req, res, 'Success')

      Notifications.emitNewDealNotification(newDeal)
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true, getLocations: true }),
  validate(editDealSchema),
  async (req, res) => {
    const {
      restaurant,
      locations: restLocations,
      params: { id },
      body: { name, description, end_date, locations },
    } = req

    try {
      const trimmedName = name.trim()
      const trimmedDescription = description.trim()

      const newDealLocations = Loc.createAddDealLocations(restLocations, locations)

      if (!newDealLocations?.length || newDealLocations.length !== locations.length) {
        Err.throw('Error: No matching locations found', 400)
      }

      const deal = await DB.RGetDealByID(id)

      if (!deal) {
        Err.throw('Deal not found', 400)
      }

      if (DB.getID(deal.restaurant) !== DB.getID(restaurant)) {
        Err.throw('Unauthorized to edit this deal', 400)
      }

      if (end_date && isBefore(new Date(end_date), new Date(deal.start_date))) {
        Err.throw('Deal end date cannot be before the start date', 400)
      }

      const newData = {
        name: trimmedName,
        description: trimmedDescription,
        end_date,
        locations: newDealLocations,
      }

      await DB.REditOneDeal(restaurant._id, deal, newData, locations)

      return Resp.json(req, res, 'Success')
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.post('/delete/:id', authWithCache, restRoleGuard(Permissions.EDIT, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    params: { id },
  } = req

  try {
    const deal = await DB.RGetDealByID(id)
    if (!deal) {
      Err.throw('Deal not found', 400)
    }

    if (DB.getID(deal.restaurant) !== DB.getID(restaurant)) {
      Err.throw('Unauthorized to delete this deal', 400)
    }

    await DB.RDeleteOneDeal(restaurant._id, deal)

    await Redis.removeAllUsers()

    return Resp.json(req, res, 'Success')
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.patch(
  '/expire/:id',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { end_date },
    } = req

    try {
      const deal = await DB.RGetDealByID(id)

      if (!deal) {
        Err.throw('Deal not found', 400)
      }

      if (DB.getID(deal.restaurant) !== DB.getID(restaurant)) {
        Err.throw('Unauthorized to expire this deal', 400)
      }

      if (deal.is_expired) {
        Err.throw('Deal is already expired', 400)
      }

      if (isBefore(new Date(), new Date(deal.start_date))) {
        Err.throw('You cant expire a deal that hasnt started yet', 400)
      }

      if (!end_date) {
        Err.throw('Must provide an end_date', 400)
      }

      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        Err.throw('You cant expire a deal that hasnt start yet... Deal end date cannot be before the start date', 400)
      }

      await DB.RExpireOneDeal(restaurant._id, deal, end_date)

      await Redis.removeAllUsers()

      return Resp.json(req, res, 'Success')
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

export default router
