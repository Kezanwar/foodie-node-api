import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'
import { renderFile } from 'ejs'
import fs from 'node:fs/promises'

import Err from '#app/services/error/index.js'
import { baseUrl } from '#app/config/config.js'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
})

class EmailService {
  #getID(doc) {
    return doc._id.toHexString()
  }

  async #createTestEmailHTMLFile(content) {
    try {
      await fs.writeFile('test.html', content)
    } catch (err) {
      console.log(err)
    }
  }

  //email addresses
  #noreply = 'noreply@thefoodie.app'

  //html templates
  #createActionEmailHTML(
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

  async sendOTPEmail(user) {
    try {
      const html = await this.#createActionEmailHTML({
        title: 'Please confirm your email address',
        receiver: user.first_name,
        content: [
          `You registered an account on Foodie, before being able to use your account you need to verify that this is your email address using the following OTP. 
        <p class="otp"><strong>${user.auth_otp}</strong><p>`,
        ],
      })
      const mailOptions = {
        from: this.#noreply,
        to: user.email,
        subject: 'Please confirm your email address',
        html,
      }
      const info = await transporter.sendMail(mailOptions)
      console.log('OTP email sent: ' + info.response)
    } catch (error) {
      Err.throw(error)
    }
  }

  async sendChangePasswordEmail(user, token) {
    try {
      const html = await this.#createActionEmailHTML({
        title: 'Change Password Request',
        receiver: user.first_name,
        content: [
          'You requested a password change, please click the button below to change your password. This link expires in 15mins.',
        ],
        action_primary: { text: 'Change your password', url: `${baseUrl}/auth/change-password/${token}` },
      })
      const mailOptions = {
        from: this.#noreply,
        to: user.email,
        subject: 'Change password request',
        html,
      }
      const info = await transporter.sendMail(mailOptions)
      console.log('Change password email sent: ' + info.response)
    } catch (err) {
      Err.throw(err)
    }
  }

  async sendAdminReviewApplicationEmail({ restaurant, locations }) {
    try {
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
        from: this.#noreply,
        to: ['shak@thefoodie.app', 'kez@thefoodie.app', 'admin@thefoodie.app'],
        subject: `New restaurant application: ${restaurant.name}`,
        html,
      }
      const info = await transporter.sendMail(mailOptions)
      console.log('Application to admin email sent: ' + info.response)
    } catch (error) {
      Err.throw(error)
    }
  }

  async sendSuccessfulApplicationEmail(user, restaurant) {
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
    })

    const mailOptions = {
      from: this.#noreply,
      to: user.email,
      subject: `Foodie Application Accepted!`,
      html,
    }
    const info = await transporter.sendMail(mailOptions)
    console.log('Successful application email sent: ' + info.response)
  }

  async sendRejectedApplicationEmail(user, restaurant) {
    const html = await this.#createActionEmailHTML({
      receiver: user.first_name,
      title: `Sorry!`,
      content: [
        `Our team reviewed your application for <strong class="primary">${restaurant.name}</strong> to partner with Foodie, and unfortunately we have decided not to move forward with your application.`,
        `If you have any questions regarding this please forward them to <a href="mailto:admin@thefoodie.app">admin@thefoodie.app</a>.`,
      ],
    })

    const mailOptions = {
      from: this.#noreply,
      to: user.email,
      subject: `Foodie Application`,
      html,
    }
    const info = await transporter.sendMail(mailOptions)
    console.log('Rejected application email sent: ' + info.response)
  }
}

export const Email = new EmailService()

export default Email
