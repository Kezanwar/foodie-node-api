import dotenv from 'dotenv'
dotenv.config()
import nodemailer from 'nodemailer'
import hbs from 'nodemailer-express-handlebars'
import email_addresses from './emails.addresses.js'

const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
})

const handlebarOptions = {
  viewEngine: {
    extname: '.handlebars',
    partialsDir: `${process.cwd()}/emails/views`,
    defaultLayout: false,
  },
  viewPath: `${process.cwd()}/emails/views`,
  extName: '.handlebars',
}

export const getEmailOptions = (to, subject, template, context) => {
  return { from: email_addresses.noreply, to, subject, template, context }
}

transporter.use('compile', hbs(handlebarOptions))

export default transporter
