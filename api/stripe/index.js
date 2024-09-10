import express, { Router } from 'express'
import WebhookHandler from './handler.js'
import Stripe from '#app/services/stripe/index.js'
import Resp from '#app/services/response/index.js'

const router = Router()

// Stripe Webhook

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const event = Stripe.verifyEventRequest(req)
    await WebhookHandler.processEvent(event)
    Resp.json(req, res, { received: true })
  } catch (err) {
    console.error(err)
    res.status(400).send(`Webhook Error: ${err.message}`)
  }
})

export default router
