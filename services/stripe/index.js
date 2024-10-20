import { baseUrl, dashboardUrl, stripeSecretApiKey, stripeWebhookSecret } from '#app/config/config.js'
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

  static unixToDate(unix) {
    return unix * 1000
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
      subscription_data: !user?.subscription.had_free_trial
        ? {
            trial_settings: {
              end_behavior: {
                missing_payment_method: 'cancel',
              },
            },
            trial_period_days: 30,
          }
        : undefined,
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${baseUrl}/rest/subscriptions/new/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${dashboardUrl}/dashboard/subscription`,
    })

    return session_url
  }

  static verifyEventRequest(request) {
    return stripe.webhooks.constructEvent(request.rawBody, request.headers['stripe-signature'], stripeWebhookSecret)
  }

  static getSuccessfulSubcriptionsSession(session_id) {
    return stripe.checkout.sessions.retrieve(session_id)
  }

  static #TIER_PRICE_TEXT_MAP = {
    1: '£49.99',
    2: '£89.99',
  }

  static getTierPriceText(tier) {
    return this.#TIER_PRICE_TEXT_MAP[tier]
  }

  static getCustomer(cust_id) {
    return stripe.customers.retrieve(cust_id)
  }

  static getSubscription(sub_id) {
    return stripe.subscriptions.retrieve(sub_id, { expand: ['latest_invoice'] })
  }

  static cancelSubscription(sub_id) {
    return stripe.subscriptions.cancel(sub_id)
  }

  static getPaymentMethod(method_id) {
    return stripe.paymentMethods.retrieve(method_id)
  }

  static getInvoice(invoice_id) {
    return stripe.invoices.retrieve(invoice_id)
  }

  static getCustomersInvoicesForSubsciption(cust_id, sub_id, limit = 10) {
    return stripe.invoices.list({
      customer: cust_id,
      limit,
      subscription: sub_id,
    })
  }
}

export default Stripe
