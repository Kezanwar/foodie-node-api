import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'

import Err from '#app/services/error/index.js'
import Resp from '#app/services/response/index.js'
import Stripe from '#app/services/stripe/index.js'
import DB from '#app/services/db/index.js'
import { startOfDay } from 'date-fns'
import Redis from '#app/services/cache/redis.js'

router.get('/', authWithCache, async (req, res) => {
  const { user } = req
  try {
    if (!user?.subscription?.subscription_tier) {
      Err.throw('No current plan', 402)
    }

    const data = await Stripe.getSubscription(user.subscription.stripe_subscription_id)

    const sub = {
      created: data.created,
      amount: data.plan?.amount,
      current_period: {
        start: Stripe.unixToDate(data.current_period_start),
        end: Stripe.unixToDate(data.current_period_end),
      },
      trial_start: Stripe.unixToDate(data.trial_start),
      trial_end: Stripe.unixToDate(data.trial_end),
      latest_invoice: {
        created: Stripe.unixToDate(data.latest_invoice.created),
        period: {
          start: Stripe.unixToDate(data.latest_invoice.period_start),
          end: Stripe.unixToDate(data.latest_invoice.period_end),
        },
        paid: data.latest_invoice.paid,
        paid_at: data.latest_invoice.status_transitions?.paid_at
          ? Stripe.unixToDate(data.latest_invoice.status_transitions?.paid_at)
          : null,
        total: data.latest_invoice.total,
        url: data.latest_invoice.hosted_invoice_url,
      },
    }

    Resp.json(req, res, sub)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/invoices', authWithCache, async (req, res) => {
  const { user } = req
  try {
    if (
      !user?.subscription?.subscription_tier ||
      !user.subscription.stripe_customer_id ||
      !user.subscription.stripe_subscription_id
    ) {
      Err.throw('No current plan', 402)
    }

    const data = await Stripe.getCustomersInvoicesForSubsciption(
      user.subscription.stripe_customer_id,
      user.subscription.stripe_subscription_id
    )

    if (!data?.data?.length) {
      Err.throw('No current plan', 402)
    }

    const santized = data.data.map((d) => {
      return {
        created: Stripe.unixToDate(d.created),
        period: {
          start: Stripe.unixToDate(d.period_start),
          end: Stripe.unixToDate(d.period_end),
        },
        paid: d.paid,
        paid_at: d.status_transitions?.paid_at ? Stripe.unixToDate(d.status_transitions?.paid_at) : null,
        total: d.total,
        url: d.hosted_invoice_url,
      }
    })

    return Resp.json(req, res, santized)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/billing', authWithCache, async (req, res) => {
  const { user } = req
  try {
    if (
      !user?.subscription?.subscription_tier ||
      !user.subscription.stripe_customer_id ||
      !user.subscription.stripe_subscription_id
    ) {
      Err.throw('No current plan', 402)
    }

    const sub = await Stripe.getSubscription(user.subscription.stripe_subscription_id)

    if (!sub.default_payment_method) {
      return Resp.json(req, res, {})
    }

    const payment_method = await Stripe.getPaymentMethod(sub.default_payment_method)

    return Resp.json(req, res, payment_method)
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.post('/cancel-plan', authWithCache, async (req, res) => {
  const { user } = req
  try {
    if (
      !user?.subscription?.subscription_tier ||
      !user.subscription.stripe_customer_id ||
      !user.subscription.stripe_subscription_id
    ) {
      Err.throw('No current plan', 402)
    }

    const cancel = await Stripe.cancelSubscription(user.subscription.stripe_subscription_id)

    await DB.RCancelSubEndOfPeriod(
      user._id,
      startOfDay(new Date(Stripe.unixToDate(cancel.current_period_end))).toISOString()
    )

    await Redis.removeUserByID(user._id)

    return Resp.json(req, res, { message: 'success' })
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
