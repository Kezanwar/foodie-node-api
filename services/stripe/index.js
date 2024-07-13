import { stripeSecretApiKey } from '#app/config/config.js'
import Stripe from 'stripe'

const stripe = new Stripe(stripeSecretApiKey)

export default stripe
