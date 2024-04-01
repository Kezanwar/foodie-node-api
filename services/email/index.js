import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'
import { renderFile } from 'ejs'
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

  //email addresses
  #noreply = 'noreply@thefoodie.app'

  //html templates
  #createActionEmailHTML(
    data = {
      title: '',
      content: '',
      receiver: '',
      action_primary: { text: '', url: '' },
      action_secondary: { text: '', url: '' },
      list: [''],
    }
  ) {
    return renderFile(process.cwd() + '/views/emails/action-email.ejs', data)
  }

  async sendOTPEmail(user) {
    try {
      const html = await this.#createActionEmailHTML({
        title: 'Please confirm your email address',
        receiver: user.first_name,
        content: `You registered an account on Foodie, before being able to use your account you need to verify that this is your email address using the following OTP. 
        <p class="otp"><strong>${user.auth_otp}</strong><p>`,
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
        content:
          'You requested a password change, please click the button below to change your password. This link expires in 15mins.',
        action_primary: { text: 'Change your password', url: `${baseUrl}/auth/change-password/${token}` },
      })
      const mailOptions = {
        from: this.#noreply,
        to: user.email,
        subject: 'Change password request',
        html,
      }
      const info = await transporter.sendMail(mailOptions)
      console.log('OTP email sent: ' + info.response)
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
        content: 'Review the application and accept / decline using the actions below.',
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
        to: ['kezanwar@gmail.com', 'shak@thefoodie.app'],
        subject: `New restaurant application: ${restaurant.name}`,
        html,
      }
      const info = await transporter.sendMail(mailOptions)
      console.log('OTP email sent: ' + info.response)
    } catch (error) {
      Err.throw(error)
    }
  }
}

export const Email = new EmailService()

export default Email
