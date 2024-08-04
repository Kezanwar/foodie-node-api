import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Permissions from '#app/services/permissions/index.js'
import Stripe from '#app/services/stripe/index.js'
import Email from '#app/services/email/index.js'

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
        return res.status(200).json('success')
      }

      if (tier === restaurant.subscription_tier) {
        Err.throw("You're already on this plan", 500)
      }

      const session_url = await Stripe.createSubscriptionCheckoutLink(tier, req.user)

      return res.status(200).json({ checkout_url: session_url.url })
    } catch (error) {
      Err.send(res, error)
    }
  }
)

router.get('/checkout-success', async (req, res) => {
  const { session_id, user_id } = req.query
  try {
    const [session, user] = await Promise.allSettled([
      Stripe.getSuccessfulSubcriptionsSession(session_id),
      DB.getUserByID(user_id),
    ])

    return res.json({ session, user })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
