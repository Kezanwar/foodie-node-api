import { Router } from 'express'

const router = Router()

import Redis from '#app/services/cache/redis.js'
import Auth from '#app/services/auth/index.js'
import Email from '#app/services/email/index.js'
import Err from '#app/services/error/index.js'

import User from '#app/models/User.js'

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'
import { loginUserSchema, registerUserSchema } from '#app/validation/auth/auth.js'

import { findUserByEmail, findUserByEmailWithPassword } from '#app/utilities/user.js'
import { capitalizeFirstLetter } from '#app/utilities/strings.js'

import { dashboardUrl } from '#app/config/config.js'

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/initialize', authWithCache, async (req, res) => {
  try {
    const user = req.user
    if (!user) throw new Error('User doesnt exist')

    res.json({ user: user.toClient() })
  } catch (error) {
    Err.send(res, error)
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
        Err.throw('Invalid credentials', 400)
      }

      if (Auth.isGoogleAuthMethod(user?.auth_method)) {
        Err.throw('User signed up using Google')
      }

      // compare the passwords if they exist

      const isMatch = await Auth.comparePasswordToHash(password, user.password)

      // if dont exist send an error

      if (!isMatch) {
        Err.throw('Invalid credentials', 400)
      }

      // is user credentials are a match
      // create the payload for JWT which includes our users id from the db

      const payload = {
        user: {
          id: user.id,
        },
      }

      const token = Auth.jwtSign30Days(payload)

      const userResponse = user.toClient()

      res.json({
        accessToken: token,
        user: userResponse,
      })
    } catch (err) {
      Err.send(res, err)
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
      if (!token) Err.throw('No token authentication error', 500)

      const userRequested = await Auth.fetchGoogleAuthUser(token)

      const { email } = userRequested.data

      let user = await findUserByEmail(email)
      if (!user) {
        Err.throw('Invalid credentials', 400)
      }

      if (Auth.isJWTAuthMethod(user?.auth_method)) {
        Err.throw('User didnt sign up with google, please sign in with email & password')
      }

      // is user credentials are a match
      // create the payload for JWT which includes our users id from the db

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = Auth.jwtSign30Days(payload)

      const userResponse = user.toClient()

      res.json({
        accessToken: access_token,
        user: userResponse,
      })
    } catch (err) {
      Err.send(res, err)
    }
  }
)

//* route POST api/auth/register
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register', validate(registerUserSchema), async (req, res) => {
  // generating errors from validator and handling them with res

  let sendEmail = false

  try {
    // destructuring from req.body
    const { first_name, last_name, email, password } = req.body

    // checking if user exists, if they do then send err
    let user = await findUserByEmail(email)

    if (user) Err.throw('User aleady exists', 400)

    // create a new user with our schema and users details from req
    user = new User({
      first_name: capitalizeFirstLetter(first_name),
      last_name: capitalizeFirstLetter(last_name),
      email: email.toLowerCase(),
      password,
      auth_method: Auth.jwtAuthMethod,
      auth_otp: Auth.createOTP(),
      email_confirmed: false,
    })

    user.password = await Auth.hashUserGeneratedPW(password)

    // save the new user to DB using mongoose and send OTP email
    await Promise.all([user.save(), Redis.setUserByID(user)])

    sendEmail = user

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = Auth.jwtSign365Days(payload)

    const userResponse = user.toClient()

    res.json({
      accessToken: access_token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(res, err)
  }

  if (sendEmail) {
    Email.sendOTPEmail(sendEmail).catch(Err.log)
  }
})

//* route POST api/auth/register-google
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register-google', async (req, res) => {
  try {
    // destructuring from req.body
    const { token } = req.body
    if (!token) Err.throw('No token authentication error', 500)

    const userRequested = await Auth.fetchGoogleAuthUser(token)

    const { given_name, family_name, picture, email } = userRequested.data

    let user = await findUserByEmail(email)

    if (user) Err.throw('User already exists', 400)

    // create a new user with our schema and users details from req
    user = new User({
      first_name: capitalizeFirstLetter(given_name),
      last_name: family_name ? capitalizeFirstLetter(family_name) : '',
      email: email.toLowerCase(),
      email_confirmed: true,
      avatar: picture,
      auth_method: Auth.googleAuthMethod,
    })

    user.password = await Auth.hashServerGeneratedPW(email)

    // save the new user to DB using mongoose
    await Promise.all([user.save(), Redis.setUserByID(user)])

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = Auth.jwtSign365Days(payload)

    const userResponse = user.toClient()

    res.json({
      accessToken: access_token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(res, err)
  }
})

//* route GET api/auth/confirm-mail/:token
//? @desc CONFIRM EMAIL ADDRESS
//! @access auth (requires token from confirm email button)

router.post('/confirm-email/:otp', authNoCache, async (req, res) => {
  const { otp } = req.params
  const user = req.user
  try {
    if (!otp) Err.throw('No OTP Passed')

    if (otp === user.auth_otp) {
      user.email_confirmed = true
      await Promise.all([user.save(), Redis.setUserByID(user)])
    } else Err.throw('Incorrect OTP please try again', 401)

    return res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

//* route POST api/auth/resend-confirm-email
//? @desc CONFIRM EMAIL ADDRESS
//! @access auth

router.patch('/confirm-email/resend-otp', authNoCache, async (req, res) => {
  const user = req.user
  try {
    user.auth_otp = Auth.createOTP()
    await Promise.all([user.save(), Redis.setUserByID(user), Email.sendOTPEmail(user)])
    res.status(200).send({ message: 'success' })
  } catch (error) {
    Err.send(res, error)
  }
})

//* route GET api/auth
//? @desc RESET PASSWORD
//! @access public

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) Err.throw('No email attached', 400)
    const user = await findUserByEmail(email)
    // eslint-disable-next-line quotes
    if (!user) Err.throw("Sorry, we can't locate a user with this email.", 400)
    if (Auth.isGoogleAuthMethod(user.auth_method))
      Err.throw('This email address signed up with Google, please login via Google.', 400)

    const confirmEmailPayload = {
      email: user.email,
    }

    const token = Auth.jwtSign15Mins(confirmEmailPayload)

    await Email.sendChangePasswordEmail(user, token)

    res.send('success')
  } catch (error) {
    Err.send(res, error)
  }
})

router.get('/change-password/:token', async (req, res) => {
  const {
    params: { token },
  } = req
  try {
    if (!token) Err.throw('No token provided')

    const decoded = Auth.jwtVerify(token)

    if (!decoded?.email) {
      Err.throw('Token expired', 400)
    }

    const payload = {
      email: decoded.email,
    }

    const forward_token = Auth.jwtSign15Mins(payload)

    const expires = Auth.createChangePWExpiryDate()

    return res.redirect(`${dashboardUrl}/change-password?token=${forward_token}&expires=${expires}`)
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
    if (!token) Err.throw('No token provided')

    const decoded = Auth.jwtVerify(token)

    if (!decoded?.email) {
      Err.throw('Token expired', 400)
    }

    const user = await findUserByEmail(decoded.email)

    if (!user) {
      Err.throw('User doesnt exist', 400)
    }

    user.password = await Auth.hashUserGeneratedPW(password)

    await Promise.all([user.save(), Redis.setUserByID(user)])

    res.json('success')
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
