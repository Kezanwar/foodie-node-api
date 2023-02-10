require('dotenv').config()
import Mailchimp from 'mailchimp-api-v3'

const mc = new Mailchimp(process.env.MAILCHIMP_API_KEY)

export default mc
