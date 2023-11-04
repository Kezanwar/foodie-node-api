import { Router } from 'express'
import { renderFile } from 'ejs'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

// models
import User from '../../../models/User.js'

// middlewares
import auth from '../../../middleware/auth.middleware.js'
import {
  SendError,
  capitalizeFirstLetter,
  createOTP,
  findUserByEmail,
  findUserByEmailWithPassword,
  removeDocumentValues,
  throwErr,
} from '../../utilities/utilities.js'
import { loginUserSchema, registerUserSchema } from '../../../validation/auth.validation.js'
import validate from '../../../middleware/validation.middleware.js'
import { AUTH_METHODS, JWT_SECRET } from '../../../constants/auth.js'
import { feUrl } from '../../../base/base.js'
import { confirm_email_content, email_addresses } from '../../../constants/email.js'
import transporter from '../../../services/email/email.services.js'

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/initialize', auth, async (req, res) => {
  try {
    const user = req.user
    if (!user) throw new Error('User doesnt exist')

    res.json({ user })
  } catch (error) {
    SendError(res, error)
  }
})

//* route POST api/auth/login
//? @desc Authenticate and log in a user and send token
//! @access public

router.post(
  '/login',
  //   middleware validating the req.body using yup
  validate(loginUserSchema),
  async (req, res) => {
    try {
      // destructuring from req.body
      const { email, password } = req.body

      // checking if user doesnt exist, if they dont then send err
      let user = await findUserByEmailWithPassword(email)

      if (!user) {
        throwErr('Invalid credentials', 400)
      }

      if (user?.auth_method !== AUTH_METHODS.jwt) {
        throwErr('User signed up using Google')
      }

      // compare the passwords if they exist

      const isMatch = await bcrypt.compare(password, user.password)

      // if dont exist send an error

      if (!isMatch) {
        throwErr('Invalid credentials', 400)
      }

      // is user credentials are a match
      // create the payload for JWT which includes our users id from the db

      const payload = {
        user: {
          id: user.id,
        },
      }

      //  call jwt sign method, poss in the payload, the jwtsecret from our config we created, an argument for optional extra parameters such as expiry, a call back function which allows us to handle any errors that occur or send the response back to user.

      jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
        if (err) throw new Error(err)
        const userResponse = removeDocumentValues(['_id', 'password'], user)
        res.json({
          accessToken: token,
          user: userResponse,
        })
      })
    } catch (err) {
      console.error(err)
      SendError(res, err)
    }
  }
)

router.post(
  '/login-google',
  //   middleware validating the req.body using yup
  async (req, res) => {
    try {
      // destructuring from req.body
      const { token } = req.body
      if (!token) throwErr('No token authentication error', 500)

      const userRequested = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)

      const { email } = userRequested.data

      let user = await findUserByEmail(email)
      if (!user) {
        throwErr('Invalid credentials', 400)
      }

      if (user?.auth_method !== AUTH_METHODS.google) {
        throwErr('User didnt sign up with google, please sign in with email & password')
      }

      // is user credentials are a match
      // create the payload for JWT which includes our users id from the db

      const payload = {
        user: {
          id: user.id,
        },
      }

      //  call jwt sign method, poss in the payload, the jwtsecret from our config we created, an argument for optional extra parameters such as expiry, a call back function which allows us to handle any errors that occur or send the response back to user.

      jwt.sign(payload, JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
        if (err) throw new Error(err)
        const userResponse = removeDocumentValues(['_id', 'password'], user)
        res.json({
          accessToken: token,
          user: userResponse,
        })
      })
    } catch (err) {
      console.error(err)
      SendError(res, err)
    }
  }
)

//* route POST api/auth/register
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register', validate(registerUserSchema), async (req, res) => {
  // generating errors from validator and handling them with res

  try {
    // destructuring from req.body
    const { first_name, last_name, email, password } = req.body

    // checking if user exists, if they do then send err
    let user = await findUserByEmail(email)

    if (user) throwErr('User aleady exists', 400)

    // create a new user with our schema and users details from req
    user = new User({
      first_name: capitalizeFirstLetter(first_name),
      last_name: capitalizeFirstLetter(last_name),
      email: email.toLowerCase(),
      password,
      auth_method: AUTH_METHODS.jwt,
      auth_otp: createOTP(),
      email_confirmed: false,
    })
    // encrypt users passsord using bcrypt
    // generate the salt
    const salt = await bcrypt.genSalt(10)
    // encrypt users password with the salt
    user.password = await bcrypt.hash(password, salt)

    // save the new user to DB using mongoose
    await user.save()

    // send OTP in email to user for them to confirm their email from either rest dashboard or
    // customer mobile app

    renderFile(
      process.cwd() + '/views/emails/action-email.ejs',
      {
        content: `${confirm_email_content.description} 
        <p class="otp"><strong>${user.auth_otp}</strong><p>`,
        title: confirm_email_content.title,
        receiver: user.first_name,
      },
      (err, data) => {
        if (err) {
          throwErr('error creating email email')
        } else {
          const mainOptions = {
            from: email_addresses.noreply,
            to: user.email,
            subject: confirm_email_content.title,
            html: data,
          }
          transporter.sendMail(mainOptions, (err, info) => {
            if (err) {
              console.log(err)
              throwErr('error sending enmail email')
            } else {
              console.log('email sent: ' + info.response)
            }
          })
        }
      }
    )

    //  call jwt sign method, poss in the payload, the jwtsecret from our config we created, an argument for optional extra parameters such as expiry, a call back function which allows us to handle any errors that occur or send the response back to user.
    const authIdPayload = {
      user: {
        id: user.id,
      },
    }

    jwt.sign(authIdPayload, JWT_SECRET, { expiresIn: '365d' }, async (err, token) => {
      if (err) throw new Error(err)
      const userResponse = removeDocumentValues(['_id', 'password'], user)
      return res.json({
        accessToken: token,
        user: userResponse,
      })
    })
  } catch (err) {
    console.error(err)
    SendError(res, err)
  }
})

//* route POST api/auth/register-google
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register-google', async (req, res) => {
  try {
    // destructuring from req.body
    const { token } = req.body
    if (!token) throwErr('No token authentication error', 500)

    const userRequested = await axios.get(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`)

    const { given_name, family_name, picture, email } = userRequested.data

    let user = await findUserByEmail(email)

    if (user) throwErr('User already exists', 400)

    // create a new user with our schema and users details from req
    user = new User({
      first_name: capitalizeFirstLetter(given_name),
      last_name: family_name ? capitalizeFirstLetter(family_name) : '',
      email: email.toLowerCase(),
      email_confirmed: true,
      avatar: picture,
      auth_method: AUTH_METHODS.google,
    })

    const password = email + process.env.GOOGLE_REGISTER_EMAIL_PW_SECRET
    // encrypt users passsord using bcrypt
    // generate the salt
    const salt = await bcrypt.genSalt(10)
    // encrypt users password with the salt
    user.password = await bcrypt.hash(password, salt)

    // save the new user to DB using mongoose
    await user.save()

    //  call jwt sign method, poss in the payload, the jwtsecret from our config we created, an argument for optional extra parameters such as expiry, a call back function which allows us to handle any errors that occur or send the response back to user.
    const authIdPayload = {
      user: {
        id: user.id,
      },
    }

    jwt.sign(authIdPayload, JWT_SECRET, { expiresIn: '365d' }, async (err, token) => {
      if (err) throw new Error(err)

      const userResponse = removeDocumentValues(['_id', 'password'], user)
      return res.json({
        accessToken: token,
        user: userResponse,
      })
    })
  } catch (err) {
    console.error(err)
    SendError(res, err)
  }
})

//* route GET api/auth/confirm-mail/:token
//? @desc CONFIRM EMAIL ADDRESS
//! @access auth (requires token from confirm email button)

router.post('/confirm-email/:otp', auth, async (req, res) => {
  const { otp } = req.params
  const user = req.user
  try {
    if (!otp) throwErr('No OTP Passed')

    if (otp === user.auth_otp) {
      user.email_confirmed = true
      await user.save()
    } else throwErr('Incorrect OTP please try again', 401)

    return res.json('success')
  } catch (error) {
    SendError(res, error)
  }
})

//* route POST api/auth/resend-confirm-email
//? @desc CONFIRM EMAIL ADDRESS
//! @access auth

router.patch('/confirm-email/resend-otp', auth, async (req, res) => {
  const user = req.user
  try {
    user.auth_otp = createOTP()
    await user.save()

    renderFile(
      process.cwd() + '/views/emails/action-email.ejs',
      {
        content: `${confirm_email_content.description} 
        <p class="otp"><strong>${user.auth_otp}</strong><p>`,
        title: confirm_email_content.title,
        receiver: user.first_name,
      },
      (err, data) => {
        if (err) {
          throwErr('error creating email email')
        } else {
          const mainOptions = {
            from: email_addresses.noreply,
            to: user.email,
            subject: confirm_email_content.title,
            html: data,
          }
          transporter.sendMail(mainOptions, (err, info) => {
            if (err) {
              console.log(err)
              throwErr('error sending email email')
            } else {
              console.log('email sent: ' + info.response)
            }
          })
        }
      }
    )
    res.status(200).send({ message: 'success' })
  } catch (error) {
    SendError(res, error)
  }
})

//* route GET api/auth
//? @desc RESET PASSWORD
//! @access public

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) throw new Error('No email attached')
    const user = await findUserByEmail(email)
    if (!user) throw new Error('Email address doesnt exist')

    // const confirmEmailPayload = {
    //   email: user.email,
    // }

    // jwt.sign(confirmEmailPayload, JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
    //   if (err) throw new Error(err)

    //   const { title, description } = confirm_email_content
    //   const emailOptions = getEmailOptions(user.email, 'Confirm your email address!', 'action-email', {
    //     user_name: user.first_name,
    //     title: title,
    //     description: description,
    //     action_text: 'Confirm email',
    //     action_href: `${process.env.BASE_URL}/auth/confirm-email/${token}`,
    //   })
    //   transporter.sendMail(emailOptions, (err, info) => {
    //     if (err) console.log(err)
    //     else console.log('email sent' + ' ' + info.response)
    //   })
    // })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
