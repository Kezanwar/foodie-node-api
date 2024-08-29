import DB from '#app/services/db/index.js'
import Email from '#app/services/email/index.js'

class WebhookHandler {
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
      case 'invoice.payment_action_required':
        /* Sent when the invoice requires customer authentication. 
        Learn how to handle the subscription when the invoice requires action. */
        await this.handleInvoicePaymentActionRequired(event.data.object)
        break
      case 'customer.subscription.updated':
        /* Sent when a subscription starts or changes. For example, renewing a subscription, 
        adding a coupon, applying a discount, adding an invoice item, 
        and changing plans all trigger this event. */
        await this.handleSubscriptionUpdated(event.data.object)
        break
      default:
        console.log(`Unhandled event type ${event.type}`)
    }
  }

  static async handleInvoiceFailed(event) {
    // todos
    // send notify to user
    // send notify to admin
    // set restaurant is_subscribed to false
    console.log(event)
  }

  static async handleInvoicePaid(event) {
    // *@event type
    // customer --> customer id (string)
    // period_end -->  timestamp for period end (int)
    // period_start -->  timestamp for period start (int)
    // hosted_invoice_url --> this is a url link to the invoice (string)

    const customer_id = 'cus_QkiR58GjQiV7Nf' // TODO: replace with event.customer
    const res = await DB.getUserAndRestaurantByStripeCustomerID(customer_id)
    if (!res) {
      //what do we wanna do here? error handling?
    }
    const { user, restaurant } = res
    await Email.sendSuccessfulInvoicePaidEmail(user, restaurant, event)

    //todos
    // maybe said a confirmation email?
    // check if restaurant has previously been defaulted on a paymented and been unsubscribed
    // console.log(event)
  }

  static async handleInvoicePaymentActionRequired(event) {
    console.log(event)
  }

  static async handleSubscriptionUpdated(event) {
    console.log(event)
  }
}

export default WebhookHandler
