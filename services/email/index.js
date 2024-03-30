import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'
import { renderFile } from 'ejs'
import { throwErr } from '#app/utilities/error.js'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
})

class EmailService {
  //email addresses
  #noreply = 'noreply@thefoodie.app'

  //html templates
  #createActionEmailHTML({ title, content, receiver, action_primary, action_secondary }) {
    return renderFile(process.cwd() + '/views/emails/action-email.ejs', {
      content,
      title,
      receiver,
      action_primary,
      action_secondary,
    })
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
      throwErr(error)
    }
  }
}

export const Email = new EmailService()

export default transporter
