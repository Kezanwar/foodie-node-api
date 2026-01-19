import nodemailer from 'nodemailer'
import { renderFile } from 'ejs'
import fs from 'node:fs/promises'

import { APP_ENV, baseUrl, dashboardUrl, SENDGRID_API_KEY } from '#app/config/config.js'
import Permissions from '../permissions/index.js'
import EventEmitter from 'node:events'
import Stripe from '../stripe/index.js'
import Str from '../string/index.js'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: SENDGRID_API_KEY,
  },
})

class Email {
  static #emitter = new EventEmitter()

  /**
   * Sends an email by emitting a send_email event with the provided mail options
   * @param {Object} mailOptions - The email configuration object
   * @param {string} mailOptions.from - The sender email address
   * @param {string|string[]} mailOptions.to - The recipient email address(es)
   * @param {string} mailOptions.subject - The email subject line
   * @param {string} mailOptions.html - The HTML content of the email
   */
  static send(mailOptions) {
    this.#emitter.emit('send_email', mailOptions)
  }

  static async onSendEmail(mailOptions) {
    try {
      const info = await transporter.sendMail(mailOptions)
      // await Email.createTestEmailHTMLFile(mailOptions.html)
      console.log('Email sent: ' + info.response)
    } catch (error) {
      console.log('email error')
      console.error(error)
    }
  }

  static start() {
    this.#emitter.on('send_email', this.onSendEmail)
  }

  static #getID(doc) {
    return doc._id.toHexString()
  }

  static async createTestEmailHTMLFile(content) {
    try {
      await fs.writeFile('test.html', content)
    } catch (err) {
      console.log(err)
    }
  }

  static sendTestEmail(to) {
    this.send({
      from: this.#email_addresses.no_reply,
      to: to,
      html: '<div>hello</div>',
      subject: 'test',
    })
  }

  static #email_addresses = {
    no_reply: 'noreply@thefoodie.app',
    admins: ['shak@thefoodie.app', 'kez@thefoodie.app', 'admin@thefoodie.app'],
  }

  //html templates
  static #createActionEmailHTML(
    data = {
      receiver: '',
      title: '',
      content: '',
      list: [''],
      bottom_content: '',
      action_primary: { text: '', url: '' },
      action_secondary: { text: '', url: '' },
    }
  ) {
    return renderFile(process.cwd() + '/views/emails/action-email.ejs', data)
  }

  static async sendOTPEmail(user) {
    const html = await this.#createActionEmailHTML({
      title: 'Please confirm your email address',
      receiver: user.first_name,
      content: [
        `You registered an account on Foodie, before being able to use your account you need to verify that this is your email address using the following OTP. 
        <p class="otp"><strong>${user.auth_otp}</strong><p>`,
      ],
    })
    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: 'Please confirm your email address',
      html,
    }

    this.send(mailOptions)
  }

  static async sendChangePasswordEmail(user, token) {
    const html = await this.#createActionEmailHTML({
      title: 'Change Password Request',
      receiver: user.first_name,
      content: [
        'You requested a password change, please click the button below to change your password. This link expires in 15mins.',
      ],
      action_primary: { text: 'Change your password', url: `${baseUrl}/auth/change-password/${token}` },
    })
    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: 'Change password request',
      html,
    }
    this.send(mailOptions)
  }

  static async sendAdminReviewApplicationEmail({ restaurant, locations }) {
    const cuisinesText = restaurant.cuisines.map((c) => c.name).join(', ')
    const dietText = restaurant.dietary_requirements.map((c) => c.name).join(', ')
    const locationsText = locations.map((c) => `${c.address.address_line_1}, ${c.address.postcode}`).join(' - ')

    const html = await this.#createActionEmailHTML({
      title: `New restaurant application: ${restaurant.name}`,
      content: ['Review the application and accept / decline using the actions below.'],
      receiver: 'Admin',
      list: [
        `Bio: ${restaurant.bio}`,
        `Cuisines: ${cuisinesText}`,
        `Dietary requirements: ${dietText}`,
        `Company name: ${restaurant.company_info.company_name}`,
        `Locations: ${locationsText}`,
        `App Environemnt: ${APP_ENV}`,
      ],
      action_primary: {
        text: 'Accept',
        url: `${baseUrl}/rest/create-restaurant/accept-application/${this.#getID(restaurant)}`,
      },
      action_secondary: {
        text: 'Decline',
        url: `${baseUrl}/rest/create-restaurant/decline-application/${this.#getID(restaurant)}`,
      },
    })
    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: this.#email_addresses.admins,
      subject: `New restaurant application: ${restaurant.name}`,
      html,
    }
    this.send(mailOptions)
  }

  static async sendSuccessfulApplicationEmail(user, restaurant) {
    const html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `Congratulations!`,
      content: [
        `Great news! We're excited to advise that your application for <strong class="primary">${restaurant.name}</strong> to partner with Foodie has been approved. Welcome aboard! 🚀`,
        `Here's what's in store for you as a Foodie partner:
      `,
      ],
      list: [
        `<strong class="primary">Boosted Visibility: </strong>Get your restaurant in front of our hungry audience actively seeking new deals and offers.`,
        `<strong class="primary" >Increased Revenues: </strong>Drive foot traffic and spike sales with tailored promotions and deals made just for your restaurant.`,
        `<strong class="primary">Your own dashboard: </strong>As our partner, you'll gain access to your own dashboard, helping you to monitor the success of your deals and offers first hand.`,
      ],
      bottom_content: [
        `Head back to your dashboard, choose a subscription plan, create some deals and start boosting footfall and increasing your sales.`,
        `Remember, each subscription tier comes with a <strong class="primary">free month</strong>, allowing you to test and see the results first hand!`,
        `We're thrilled to have you on board.`,
      ],
      action_primary: {
        text: 'Go To Dashboard',
        url: `${dashboardUrl}/dashboard`,
      },
    })

    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: `Foodie Application Accepted!`,
      html,
    }
    this.send(mailOptions)
  }

  static async sendRejectedApplicationEmail(user, restaurant) {
    const html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `Sorry!`,
      content: [
        `Our team reviewed your application for <strong class="primary">${restaurant.name}</strong> to partner with Foodie, and unfortunately we have decided not to move forward with your application.`,
        `If you have any questions regarding this please forward them to <a href="mailto:admin@thefoodie.app">admin@thefoodie.app</a>.`,
      ],
    })

    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: `Foodie Application`,
      html,
    }

    this.send(mailOptions)
  }

  static async sendEnterpriseContactSalesEnquiry(restaurant, contact) {
    /* 
    restaurant = {name, ...restaurant}
    (if no ...rest the enquiry has come from the Landing Page)

    contact = {email, first_name, ...user}
    (if no ...user the enquiry has come from the Landing Page)
    */

    const source = restaurant._id ? 'Restaurant Dashboard' : 'Landing Page'
    const currentTier = restaurant?.tier ? Permissions.getTierName(restaurant.tier) : 'None'

    const html = await this.#createActionEmailHTML({
      receiver: 'Admin',
      title: `Enterpise Price Enquiry!`,
      content: [
        `Great news! An enquiry for Enterprise Pricing has come through from <strong class="primary">${restaurant.name}.</strong>,`,
        `This enquiry came from the <span class="primary">${source}</span>`,
      ],
      list: [
        `<strong>Restaurant:</strong> ${restaurant.name}`,
        `<strong>Current Subscription:</strong> ${currentTier}`,
        `<strong>Contact Name:</strong> ${contact.first_name || 'none'}`,
        `<strong>Contact Email:</strong> ${contact.email}`,
      ],
    })

    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: this.#email_addresses.admins,
      subject: `Enterprise Sales Enquiry`,
      html,
    }

    this.send(mailOptions)
  }

  static async sendSuccessfulSubscriptionSetupEmail(user, restaurant, tier) {
    const tier_name = Permissions.getTierName(tier)
    const user_html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `${tier_name} Subcription Created!`,
      content: [
        `Great news! Your subscription for <strong class="primary">${restaurant.name}</strong> is all setup 🚀`,
      ],
      bottom_content: [
        `Head back to your dashboard, create some deals and start boosting footfall and increasing your sales!`,
        `Remember, your <strong class="primary">${tier_name.toLowerCase()} subscription</strong /> comes with the <strong class="primary">1st month free</strong>, allowing you to test and see the results first hand! Followed by ${Stripe.getTierPriceText(
          tier
        )} recurring monthy (cancelable at any time).`,
        'You can manage your subscription through your dashboard.',
        "We're thrilled to have you on board!",
      ],
      action_primary: {
        text: 'Go To Dashboard',
        url: `${dashboardUrl}/dashboard`,
      },
    })

    const userMailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: `Foodie - ${tier_name} Subcription Created!`,
      html: user_html,
    }
    this.send(userMailOptions)

    const admin_html = await this.#createActionEmailHTML({
      receiver: 'Admin',
      title: `${restaurant.name} Subscribed!`,
      content: [`Great news! ${restaurant.name} created a ${tier_name} subscription 🚀`],
    })

    const adminMailOptions = {
      from: this.#email_addresses.no_reply,
      to: this.#email_addresses.admins,
      subject: `${restaurant.name} Subcription Created!`,
      html: admin_html,
    }
    this.send(adminMailOptions)
  }

  static async sendSuccessfulInvoicePaidEmail(user, restaurant, event) {
    const period_start = Str.formatTimestampToUKDateString(Stripe.unixToDate(event.period_start))
    const period_end = Str.formatTimestampToUKDateString(Stripe.unixToDate(event.period_end))

    const html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `Successful Payment`,
      content: [
        `Great news! We received a subscripton payment for ${restaurant.name}, for the period of <span class="primary">${period_start} - ${period_end}</span> 🚀`,
      ],
      bottom_content: [`You can view your payment history and manage your subscription through your dashboard.`],
      action_primary: { text: 'View/Download Invoice', url: event.hosted_invoice_url },
    })

    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: `Foodie - Successful Payment`,
      html: html,
    }
    this.send(mailOptions)
  }

  static async sendFailedInvoicePaymentEmail(user, restaurant, event) {
    const period_start = Str.formatTimestampToUKDateString(Stripe.unixToDate(event.period_start))
    const period_end = Str.formatTimestampToUKDateString(Stripe.unixToDate(event.period_end))

    const html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `Payment Failed`,
      content: [
        `Unfortunately we failed to take a subscription payment for ${restaurant.name}, for the period of <span class="primary">${period_start} - ${period_end}</span>`,
        'All your deals have been expired, and locations have been temporarily hidden from the platform.',
        'To rectify this, resubscribe through your dashboard.',
      ],
      action_primary: { text: 'Go To Dashboard', url: `${dashboardUrl}/dashboard/subscription` },
    })

    const mailOptions = {
      from: this.#email_addresses.no_reply,
      to: user.email,
      subject: `Foodie - Failed Payment`,
      html: html,
    }
    this.send(mailOptions)

    const adminHtml = await this.#createActionEmailHTML({
      receiver: 'Admin',
      title: `${restaurant.name} Payment Failed`,
      content: [
        `Unfortunately we failed to take a subscription payment for ${restaurant.name}, for the period of <span class="primary">${period_start} - ${period_end}</span>`,
        'All their deals and locations have been temporarily dectivated from the platform and they have been notified.',
      ],
    })

    const adminMailOptions = {
      from: this.#email_addresses.no_reply,
      to: this.#email_addresses.admins,
      subject: `${restaurant.name} Payment Failed`,
      html: adminHtml,
    }

    this.send(adminMailOptions)
  }
}

export default Email
