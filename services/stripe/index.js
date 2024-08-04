import { baseUrl, dashboardUrl, stripeSecretApiKey } from '#app/config/config.js'
import { inidividualPriceID, premiumPriceID } from '#app/config/config.js'
import StripeSdk from 'stripe'
import Permissions from '../permissions/index.js'

const stripe = new StripeSdk(stripeSecretApiKey)

class Stripe {
  static #SUB_PRICE_IDS = {
    [Permissions.individual_tier]: inidividualPriceID,
    [Permissions.premium_tier]: premiumPriceID,
  }

  static getPriceID(tier) {
    return this.#SUB_PRICE_IDS[tier]
  }

  static getDocID(doc) {
    return doc._id.toHexString()
  }

  static async createSubscriptionCheckoutLink(tier, user) {
    const session_url = await stripe.checkout.sessions.create({
      mode: 'subscription',
      metadata: {
        tier,
        user_id: this.getDocID(user),
      },
      line_items: [
        {
          price: this.getPriceID(tier),
          // For metered billing, do not pass quantity
          quantity: 1,
        },
      ],
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${baseUrl}/rest/subscriptions/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${dashboardUrl}/dashboard/subscription`,
    })

    return session_url
  }

  static getSuccessfulSubcriptionsSession(session_id) {
    return stripe.checkout.sessions.retrieve(session_id)
  }

  static getCustomer
}

export default Stripe
