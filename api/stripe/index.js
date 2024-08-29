import express, { Router } from 'express'
import WebhookHandler from './handler.js'
import Stripe from '#app/services/stripe/index.js'

const router = Router()

// Stripe Webhook

router.post('/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  try {
    const event = Stripe.verifyEventRequest(request)
    await WebhookHandler.processEvent(event)
    response.json({ received: true })
  } catch (err) {
    console.log(err)
    response.status(400).send(`Webhook Error: ${err.message}`)
  }
})

export default router
