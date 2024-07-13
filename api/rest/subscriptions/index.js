import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import restRoleGuard from '#app/middleware/rest-role-guard.js'

import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Permissions from '#app/services/permissions/index.js'
import stripe from '#app/services/stripe/index.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.post(
  '/choose-plan',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { acceptedOnly: true }),
  async (req, res) => {
    const plan = req.body.plan
    const restaurant = req.restaurant
    try {
      const tier = Permissions.getSubscriptionTier(plan)

      if (tier === restaurant.plan) {
        return res.status(200).json('Youre already on this plan')
      }

      const priceID = Permissions.getPriceID(tier)

      if (!priceID) {
        Err.throw('Plan not found', 500)
      }

      //   const session_url = await stripe.checkout.sessions.create({
      //     mode: 'subscription',
      //     line_items: [
      //       {
      //         price: priceID,
      //         // For metered billing, do not pass quantity
      //         quantity: 1,
      //       },
      //     ],
      //     // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      //     // the actual Session ID is returned in the query parameter when your customer
      //     // is redirected to the success page.
      //     success_url: 'https://example.com/success.html?session_id={CHECKOUT_SESSION_ID}',
      //     cancel_url: 'https://example.com/canceled.html',
      //   })

      return res.status(200).json('success')
    } catch (error) {
      Err.send(res, error)
    }
  }
)

export default router
