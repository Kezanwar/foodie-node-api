import { Router } from 'express'
import { renderFile } from 'ejs'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()
import axios from 'axios'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { addMinutes } from 'date-fns'

import User from '#app/models/User.js'

import auth from '#app/middleware/auth.js'

import { loginUserSchema, registerUserSchema } from '#app/validation/auth/auth.js'
import validate from '#app/middleware/validation.js'

import { SendError, throwErr } from '#app/utilities/error.js'
import { findUserByEmail, findUserByEmailWithPassword } from '#app/utilities/user.js'
import { capitalizeFirstLetter } from '#app/utilities/strings.js'
import { createOTP } from '#app/utilities/otp.js'

import { AUTH_METHODS, JWT_SECRET } from '#app/constants/auth.js'
import { confirm_email_content, email_addresses } from '#app/constants/email.js'

import transporter from '#app/services/email/index.js'
import { baseUrl, dashboardUrl } from '#app/config/config.js'

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/initialize', auth, async (req, res) => {
  try {
    const user = req.user
    if (!user) throw new Error('User doesnt exist')

    res.json({ user: user.toClient() })
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
        const userResponse = user.toClient()
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
        const userResponse = user.toClient()
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
      const userResponse = user.toClient()
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

      const userResponse = user.toClient()
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
    if (!email) throwErr('No email attached', 400)
    const user = await findUserByEmail(email)
    // eslint-disable-next-line quotes
    if (!user) throwErr("Sorry, we can't locate a user with this email.", 400)
    if (user.auth_method === AUTH_METHODS.google)
      throwErr('This email address signed up with Google, please login via Google.', 400)

    const confirmEmailPayload = {
      email: user.email,
    }

    jwt.sign(confirmEmailPayload, JWT_SECRET, { expiresIn: '15m' }, async (err, token) => {
      if (err) throwErr(err)

      renderFile(
        process.cwd() + '/views/emails/action-email.ejs',
        {
          content:
            'You requested a password change, please click the button below to change your password. This link expires in 15mins.',
          title: 'Change Password Request',
          receiver: user.first_name,
          action_primary: { text: 'Change your password', url: `${baseUrl}/auth/change-password/${token}` },
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
                throwErr('error sending change password email')
              } else {
                console.log('email sent: ' + info.response)
              }
            })
          }
        }
      )
    })

    res.send('success')
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/change-password/:token', async (req, res) => {
  const {
    params: { token },
  } = req
  try {
    if (!token) throwErr('No token provided')

    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded?.email) {
      throwErr('Token expired', 400)
    }

    let payload = {
      email: decoded.email,
    }

    jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }, async (err, token) => {
      if (err) throwErr(err)

      const expires = addMinutes(new Date(), 15).toISOString()

      return res.redirect(`${dashboardUrl}/change-password?token=${token}&expires=${expires}`)
    })
  } catch (error) {
    return res.redirect(`${dashboardUrl}/change-password?token=expired`)
  }
})

router.patch('/change-password/:token', async (req, res) => {
  const {
    params: { token },
    body: { password },
  } = req

  try {
    if (!token) throwErr('No token provided')

    const decoded = jwt.verify(token, JWT_SECRET)

    if (!decoded?.email) {
      throwErr('Token expired', 400)
    }

    const user = await findUserByEmail(decoded.email)

    if (!user) {
      throwErr('User doesnt exist', 400)
    }

    const salt = await bcrypt.genSalt(10)

    user.password = await bcrypt.hash(password, salt)

    await user.save()

    res.json('success')
  } catch (error) {
    SendError(res, error)
  }
})

export default router
