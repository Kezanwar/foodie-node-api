import { Router } from 'express'

const router = Router()

import Redis from '#app/services/cache/redis.js'
import Auth from '#app/services/auth/index.js'
import Email from '#app/services/email/index.js'
import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Str from '#app/services/string/index.js'

import User from '#app/models/User.js'

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'
import { loginUserSchema, registerUserSchema } from '#app/validation/auth/auth.js'

import { dashboardUrl } from '#app/config/config.js'
import Notifications from '#app/services/notifications/index.js'
import Resp from '#app/services/response/index.js'

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/initialize', authWithCache, async (req, res) => {
  try {
    const user = req.user

    if (!user) {
      Err.throw('User doesnt exist')
    }

    Resp.json(req, res, { user: user.toClient() })
  } catch (error) {
    Err.send(req, res, error)
  }
})

//* route POST api/auth/login
//? @desc Authenticate and log in a user and send token
//! @access public

router.post('/login', validate(loginUserSchema), async (req, res) => {
  try {
    const { email, password, pushToken } = req.body

    let user = await DB.getUserByEmailWithPassword(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!Auth.isJWTAuthMethod(user?.auth_method)) {
      Err.throw('User signed up using a different sign in method.')
    }

    const isMatch = await Auth.comparePasswordToHash(password, user.password)

    if (!isMatch) {
      Err.throw('Invalid credentials', 400)
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await DB.clearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await DB.saveNewUserPushToken(user, pushToken)
      }
    }

    const payload = {
      user: {
        id: user.id,
      },
    }

    const token = Auth.jwtSign30Days(payload)

    const userResponse = user.toClient()

    Resp.json(req, res, {
      accessToken: token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(req, res, err)
  }
})

router.post('/login-google', async (req, res) => {
  try {
    const { token, pushToken } = req.body

    if (!token) {
      Err.throw('No token authentication error', 500)
    }

    const userRequested = await Auth.fetchGoogleOAuthUser(token)

    const { email } = userRequested.data

    const user = await DB.getUserByEmail(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!Auth.isGoogleAuthMethod(user?.auth_method)) {
      Err.throw('User didnt sign up with google, please sign in with original sign in method')
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await DB.clearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await DB.saveNewUserPushToken(user, pushToken)
      }
    }

    await Redis.setUserByID(user)

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = Auth.jwtSign30Days(payload)

    const userResponse = user.toClient()

    Resp.json(req, res, {
      accessToken: access_token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(req, res, err)
  }
})

router.post('/login-apple', async (req, res) => {
  try {
    // destructuring from req.body
    const { credential, pushToken } = req.body

    if (!credential.identityToken) Err.throw('No credential error', 500)

    const userRequested = await Auth.verifyAppleIdToken(credential.identityToken)

    const { email } = userRequested

    const user = await DB.getUserByEmail(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!Auth.isAppleAuthMethod(user?.auth_method)) {
      Err.throw('User didnt sign up with apple, please sign in with original sign in method')
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await DB.clearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await DB.saveNewUserPushToken(user, pushToken)
      }
    }

    await Redis.setUserByID(user)

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = Auth.jwtSign30Days(payload)

    const userResponse = user.toClient()

    Resp.json(req, res, {
      accessToken: access_token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(req, res, err)
  }
})

//* route POST api/auth/register
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register', validate(registerUserSchema), async (req, res) => {
  // generating errors from validator and handling them with res

  let sendEmail = false

  try {
    // destructuring from req.body
    const { first_name, last_name, email, password, pushToken } = req.body

    // checking if user exists, if they do then send err
    let user = await DB.getUserByEmail(email)

    if (user) {
      Err.throw('User aleady exists', 400)
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }
      await DB.clearPushTokenFromOtherUsers(pushToken)
    }

    // create a new user with our schema and users details from req
    user = new User({
      first_name: Str.capitalizeFirstLetter(first_name),
      last_name: Str.capitalizeFirstLetter(last_name),
      email: email.toLowerCase(),
      email_private: false,
      password,
      auth_method: Auth.jwtAuthMethod,
      auth_otp: Auth.createOTP(),
      email_confirmed: false,
      push_tokens: pushToken ? [pushToken] : [],
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

    await Email.sendOTPEmail(sendEmail)

    Resp.json(req, res, {
      accessToken: access_token,
      user: userResponse,
    })
  } catch (err) {
    Err.send(req, res, err)
  }
})

//* route POST api/auth/register-google
//? @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
//! @access public

router.post('/register-google', async (req, res) => {
  try {
    // destructuring from req.body
    const { token, pushToken } = req.body
    if (!token) Err.throw('No token authentication error', 500)

    const userRequested = await Auth.fetchGoogleOAuthUser(token)

    const { given_name, family_name, picture, email } = userRequested.data

    let user = await DB.getUserByEmail(email)

    if (user) {
      //USER ALREADY EXISTS, JUST LOG THEM IN

      if (!Auth.isGoogleAuthMethod(user?.auth_method)) {
        Err.throw('User didnt sign up with google, please sign in with original Sign in method')
      }

      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }

        await DB.clearPushTokenFromOtherUsers(pushToken, user._id)

        if (!user.push_tokens.includes(pushToken)) {
          await DB.saveNewUserPushToken(user, pushToken)
        }
      }

      await Redis.setUserByID(user)

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = Auth.jwtSign30Days(payload)

      const userResponse = user.toClient()

      Resp.json(req, res, {
        accessToken: access_token,
        user: userResponse,
      })
    } else {
      //NEW USER - REGISTER A NEW USER
      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }
        await DB.clearPushTokenFromOtherUsers(pushToken)
      }

      // create a new user with our schema and users details from req
      user = new User({
        first_name: Str.capitalizeFirstLetter(given_name),
        last_name: family_name ? Str.capitalizeFirstLetter(family_name) : '',
        email: email.toLowerCase(),
        email_confirmed: true,
        email_private: false,
        avatar: picture,
        auth_method: Auth.googleAuthMethod,
        push_tokens: pushToken ? [pushToken] : [],
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

      Resp.json(req, res, {
        accessToken: access_token,
        user: userResponse,
      })
    }
  } catch (err) {
    Err.send(req, res, err)
  }
})

router.post('/register-apple', async (req, res) => {
  try {
    // destructuring from req.body
    const { credential, pushToken } = req.body

    if (!credential.identityToken) Err.throw('No credential error', 500)

    const userRequested = await Auth.verifyAppleIdToken(credential.identityToken)

    const { email, is_private_email } = userRequested

    let user = await DB.getUserByEmail(email)

    if (user) {
      //USER ALREADY EXISTS, JUST LOG THEM IN

      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }

        await DB.clearPushTokenFromOtherUsers(pushToken, user._id)

        if (!user.push_tokens.includes(pushToken)) {
          await DB.saveNewUserPushToken(user, pushToken)
        }
      }

      await Redis.setUserByID(user)

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = Auth.jwtSign30Days(payload)

      const userResponse = user.toClient()

      Resp.json(req, res, {
        accessToken: access_token,
        user: userResponse,
      })
    } else {
      //NEW USER - REGISTER A NEW USER
      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }
        await DB.clearPushTokenFromOtherUsers(pushToken)
      }

      // create a new user with our schema and users details from req
      user = new User({
        first_name: credential.givenName ? Str.capitalizeFirstLetter(credential.givenName) : '',
        last_name: credential.familyName ? Str.capitalizeFirstLetter(credential.familyName) : '',
        email: email.toLowerCase(),
        email_confirmed: true,
        email_private: is_private_email,
        auth_method: Auth.appleAuthMethod,
        push_tokens: pushToken ? [pushToken] : [],
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

      Resp.json(req, res, {
        accessToken: access_token,
        user: userResponse,
      })
    }
  } catch (err) {
    Err.send(req, res, err)
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
    } else {
      Err.throw('Incorrect OTP please try again', 401)
    }

    return Resp.json(req, res, 'success')
  } catch (error) {
    Err.send(req, res, error)
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
    Resp.json(req, res, { message: 'success' })
  } catch (error) {
    Err.send(req, res, error)
  }
})

//* route GET api/auth
//? @desc RESET PASSWORD
//! @access public

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body

    if (!email) {
      Err.throw('No email attached', 400)
    }

    const user = await DB.getUserByEmail(email)

    if (!user) {
      Err.throw("Sorry, we can't locate a user with this email.", 400)
    }
    if (Auth.isGoogleAuthMethod(user.auth_method))
      Err.throw('This email address signed up with Google, please login via Google.', 400)

    const confirmEmailPayload = {
      email: user.email,
    }

    const token = Auth.jwtSign15Mins(confirmEmailPayload)

    await Email.sendChangePasswordEmail(user, token)

    Resp.json(req, res, 'success')
  } catch (error) {
    Err.send(req, res, error)
  }
})

router.get('/change-password/:token', async (req, res) => {
  const {
    params: { token },
  } = req
  try {
    if (!token) {
      Err.throw('No token provided')
    }

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
    if (!token) {
      Err.throw('No token provided')
    }

    const decoded = Auth.jwtVerify(token)

    if (!decoded?.email) {
      Err.throw('Token expired', 400)
    }

    const user = await DB.getUserByEmail(decoded.email)

    if (!user) {
      Err.throw('User doesnt exist', 400)
    }

    user.password = await Auth.hashUserGeneratedPW(password)

    await Promise.all([user.save(), Redis.setUserByID(user)])

    Resp.json(req, res, 'success')
  } catch (error) {
    Err.send(req, res, error)
  }
})

//* route GET api/auth/delete
//? @desc CONFIRM EMAIL ADDRESS
//! @access auth (requires token from confirm email button)

router.post('/delete', authNoCache, async (req, res) => {
  const user = req.user
  try {
    if (user.restaurant?.id) {
      Err.throw('Please contact support if you wish to delete your account')
    }

    await Redis.removeUserByID(user._id)
    await DB.deleteUserByID(user._id)
    return Resp.json(req, res, 'success')
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
