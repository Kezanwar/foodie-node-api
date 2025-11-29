import express, { Router } from 'express'
import WebhookHandler from './handler.js'
import Stripe from '#app/services/stripe/index.js'
import Resp from '#app/services/response/index.js'
import Logger from '#app/services/log/index.js'

const router = Router()

// Stripe Webhook
const webhook_received_resp = { received: true }

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = Stripe.verifyEventRequest(req)
    await WebhookHandler.processEvent(event)
    Resp.json(req, res, webhook_received_resp)
  } catch (err) {
    Logger.red(err?.message)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

export default router
