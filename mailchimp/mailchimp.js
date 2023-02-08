require('dotenv').config()
const Mailchimp = require('mailchimp-api-v3')

const mc = new Mailchimp(process.env.MAILCHIMP_API_KEY)

module.exports = mc
