import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'
import Email from '#app/services/email/index.js'
import WebhookError from './error.js'

export const TEST_CUST_ID = 'cus_QxoeV3ueAWMCDf'

// https://docs.stripe.com/billing/subscriptions/webhooks?locale=en-GB#events

class WebhookHandler {
  static throw(msg, event, code = 500) {
    const exception = new WebhookError(msg, event, code)
    throw exception
  }

  static printUnhandledEvent(event) {
    console.log(`🛑 Unhandled event type ${event.type}`)
  }

  static printHandleEvent(event) {
    console.log(`🚀 Handled event type ${event.type}`)
  }

  static async processEvent(event) {
    switch (event.type) {
      case 'invoice.payment_failed':
        /* A payment for an invoice failed. The PaymentIntent status changes to requires_action. The status of the subscription continues to be incomplete only for the subscription’s first invoice. If a payment fails, there are several possible actions to take:
      
        Notify the customer. Read about how you can configure subscription settings to enable Smart Retries and other revenue recovery features.
        If you’re using PaymentIntents, collect new payment information and confirm the PaymentIntent.
        Update the default payment method on the subscription. */
        await this.handleInvoiceFailed(event.data.object)
        break
      case 'invoice.paid':
        /* Sent when the invoice is successfully paid. You can provision 
        access to your product when you receive this event 
        and the subscription status is active. */
        await this.handleInvoicePaid(event.data.object)
        break

      // case 'invoice.payment_action_required':
      //   /* Sent when the invoice requires customer authentication.
      //   Learn how to handle the subscription when the invoice requires action. */
      //   await this.handleInvoicePaymentActionRequired(event.data.object)
      //   break
      case 'customer.subscription.updated':
        /* Sent when a subscription starts or changes. For example, renewing a subscription, 
        adding a coupon, applying a discount, adding an invoice item, 
        and changing plans all trigger this event. */
        await this.handleSubscriptionUpdated(event.data.object)
        break
      default:
        this.printUnhandledEvent(event)
        return
    }
    this.printHandleEvent(event)
  }

  static async handleInvoiceFailed(event) {
    // *@event type
    // customer --> customer id (string)
    // period_end -->  timestamp for period end (int)
    // period_start -->  timestamp for period start (int)
    // hosted_invoice_url --> this is a url link to the invoice (string)

    const customer_id = TEST_CUST_ID // TODO: remove hardcoded test value
    // const customer_id = event.customer
    const res = await DB.getUserAndRestaurantByStripeCustomerID(customer_id)

    if (!res) {
      this.throw('cant find user with that customer ID', 'invoice.failed', 404)
    }

    const { user, restaurant } = res

    const proms = [
      Email.sendFailedInvoicePaymentEmail(user, restaurant._id, event), //email user with invoice
      DB.RUnsubscribeRestaurant(user._id, restaurant._id),
      DB.RDowngradeRestaurant(restaurant._id),
      Redis.removeUserByID(user._id),
    ]

    await Promise.all(proms)
  }

  static async handleInvoicePaid(event) {
    // *@event type
    // customer --> customer id (string)
    // period_end -->  timestamp for period end (int)
    // period_start -->  timestamp for period start (int)
    // hosted_invoice_url --> this is a url link to the invoice (string)

    const customer_id = TEST_CUST_ID // TODO: remove hardcoded test value
    // const customer_id = event.customer
    const res = await DB.getUserAndRestaurantByStripeCustomerID(customer_id)

    if (!res) {
      this.throw('cant find user with that customer ID', 'invoice.paid', 404)
    }

    const { user, restaurant } = res

    //email user with invoice
    const proms = [Email.sendSuccessfulInvoicePaidEmail(user, restaurant, event)]

    await Promise.all(proms)
  }

  static async handleInvoicePaymentActionRequired(event) {
    console.log(event)
  }

  static async handleSubscriptionUpdated(event) {
    // *@event type
    // customer --> customer id (string)
    // current_period_start -->  timestamp for period start (int)
    // current_period_end -->  timestamp for period end (int)
    // items --> object, has .url that looks like an API endpoint (string)
    // plan --> object with new plan details --> product (product ID), amount (int), created (timestamp) id (price_id)
    console.log(event)
  }
}

export default WebhookHandler
