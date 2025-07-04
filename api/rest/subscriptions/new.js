import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Permissions from '#app/services/permissions/index.js'
import Stripe from '#app/services/stripe/index.js'
import Email from '#app/services/email/index.js'
import Redis from '#app/services/cache/redis.js'
import { dashboardUrl } from '#app/config/config.js'
import Resp from '#app/services/response/index.js'

router.post(
  '/choose-plan',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true }),
  async (req, res) => {
    const plan = req.body.plan
    const restaurant = req.restaurant
    try {
      const tier = Permissions.getSubscriptionTier(plan)

      if (!tier) {
        Err.throw('Plan not found', 500)
      }

      if (Permissions.isEnterprise(tier)) {
        await Email.sendEnterpriseContactSalesEnquiry(restaurant, req.user)
        return Resp.json(req, res, 'success')
      }

      if (tier === restaurant.subscription_tier) {
        Err.throw("You're already on this plan", 500)
      }

      const session_url = await Stripe.createSubscriptionCheckoutLink(tier, req.user)

      return Resp.json(req, res, { checkout_url: session_url.url })
    } catch (error) {
      Err.send(req, res, error)
    }
  }
)

router.get('/checkout-success', async (req, res) => {
  const { session_id } = req.query
  try {
    const session = await Stripe.getSuccessfulSubcriptionsSession(session_id)

    if (!session) {
      Err.throw('Access denied', 402)
    }

    let user = await Redis.getUserByID(session.metadata.user_id)

    if (!user) {
      user = await DB.getUserByID(session.metadata.user_id)
    }

    if (!user) {
      Err.throw('Access denied', 402)
    }

    const restaurant = await DB.RGetRestaurantByID(user.restaurant.id)

    const tier = Number(session.metadata.tier)

    if (restaurant.is_subscribed) {
      await DB.RAddPastSubscription(user._id, user.subscription.stripe_subscription_id)

      const isDowngrading = Permissions.isDowngrading(restaurant.tier, tier)

      if (isDowngrading) {
        await DB.RDowngradeRestaurant(restaurant._id)
      }
    }

    const subscription = {
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      subscription_tier: tier,
      had_free_trial: true,
      subscribed: true,
      has_cancelled: false,
      cancelled_end_date: null,
    }

    restaurant.is_subscribed = Permissions.SUBSCRIBED
    restaurant.tier = tier

    await Promise.all([
      DB.RSetLocationsIsSubscribed(restaurant._id, Permissions.SUBSCRIBED),
      Email.sendSuccessfulSubscriptionSetupEmail(user, restaurant, tier),
      DB.updateUser(user, { subscription }),
      restaurant.save(),
      Redis.removeUserByID(user._id),
    ])

    return res.redirect(`${dashboardUrl}/dashboard/subscription`)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
