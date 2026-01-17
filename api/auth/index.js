import { Router } from 'express'

const router = Router()

import Redis from '#app/services/cache/redis.js'

import Email from '#app/services/email/index.js'
import Err from '#app/services/error/index.js'
import Str from '#app/services/string/index.js'

import User from '#app/models/user.js'

import validate from '#app/middleware/validate.js'
import { loginUserSchema, registerUserSchema } from '#app/validation/auth/auth.js'

import { dashboardUrl } from '#app/config/config.js'
import Notifications from '#app/services/notifications/index.js'
import Resp from '#app/services/response/index.js'
import HttpResponse, { SuccessResponse } from '#app/services/response/http-response.js'
import AuthRepo from '#app/repositories/auth/index.js'
import AuthUtil from '#app/repositories/auth/util.js'
import { authNoCache, authWithCache } from '#app/middleware/auth.js'

class InitializeResponse extends HttpResponse {
  constructor(user, datasource) {
    super()
    this.user = user
    this.datasource = datasource
  }

  buildResponse() {
    const r = { user: this.user.toClient() }
    if (this.datasource) {
      r.datasource = this.datasource
    }
    return r
  }
}

class AuthResponse extends HttpResponse {
  constructor(accessToken, user, datasource) {
    super()
    this.accessToken = accessToken
    this.user = user
    this.datasource = datasource
  }

  buildResponse() {
    const r = {
      accessToken: this.accessToken,
      user: this.user.toClient(),
    }
    if (this.datasource) {
      r.datasource = this.datasource
    }
    return r
  }
}

const getAppInitDatasources = async (user) => {
  const [deal_favourites, location_follows] = await AuthRepo.GetFavouritesAndFollowsStateMapDatasource(user._id)
  return { deal_favourites, location_follows }
}

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/initialize', authWithCache, async (req, res) => {
  try {
    const user = req.user

    if (!user) {
      Err.throw('User doesnt exist')
    }

    if (req.is_native_app) {
      const datasources = await getAppInitDatasources(user)
      Resp.json(req, res, new InitializeResponse(user, datasources))
    } else {
      Resp.json(req, res, new InitializeResponse(user))
    }
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

    let user = await AuthRepo.GetUserByEmailWithPassword(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!AuthUtil.isJWTAuthMethod(user?.auth_method)) {
      Err.throw('User signed up using a different sign in method.')
    }

    const isMatch = await AuthUtil.comparePasswordToHash(password, user.password)

    if (!isMatch) {
      Err.throw('Invalid credentials', 400)
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await AuthRepo.SaveNewUserPushToken(user, pushToken)
      }
    }

    const payload = {
      user: {
        id: user.id,
      },
    }

    const token = AuthUtil.jwtSign30Days(payload)

    if (req.is_native_app) {
      const datasources = await getAppInitDatasources(user)
      Resp.json(req, res, new AuthResponse(token, user, datasources))
    } else {
      Resp.json(req, res, new AuthResponse(token, user))
    }
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

    const userRequested = await AuthUtil.fetchGoogleOAuthUser(token)

    const { email } = userRequested.data

    const user = await AuthRepo.GetUserByEmail(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!AuthUtil.isGoogleAuthMethod(user?.auth_method)) {
      Err.throw('User didnt sign up with google, please sign in with original sign in method')
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await AuthRepo.SaveNewUserPushToken(user, pushToken)
      }
    }

    await Redis.setUserByID(user)

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = AuthUtil.jwtSign30Days(payload)

    if (req.is_native_app) {
      const datasources = await getAppInitDatasources(user)
      Resp.json(req, res, new AuthResponse(access_token, user, datasources))
    } else {
      Resp.json(req, res, new AuthResponse(access_token, user))
    }
  } catch (err) {
    Err.send(req, res, err)
  }
})

router.post('/login-apple', async (req, res) => {
  try {
    // destructuring from req.body
    const { credential, pushToken } = req.body

    if (!credential.identityToken) Err.throw('No credential error', 500)

    const userRequested = await AuthUtil.verifyAppleIdToken(credential.identityToken)

    const { email } = userRequested

    const user = await AuthRepo.GetUserByEmail(email)

    if (!user) {
      Err.throw('Invalid credentials', 400)
    }

    if (!AuthUtil.isAppleAuthMethod(user?.auth_method)) {
      Err.throw('User didnt sign up with apple, please sign in with original sign in method')
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }

      await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

      if (!user.push_tokens.includes(pushToken)) {
        await AuthRepo.SaveNewUserPushToken(user, pushToken)
      }
    }

    await Redis.setUserByID(user)

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = AuthUtil.jwtSign30Days(payload)

    if (req.is_native_app) {
      const datasources = await getAppInitDatasources(user)
      Resp.json(req, res, new AuthResponse(access_token, user, datasources))
    } else {
      Resp.json(req, res, new AuthResponse(access_token, user))
    }
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
    let user = await AuthRepo.GetUserByEmail(email)

    if (user) {
      Err.throw('User aleady exists', 400)
    }

    if (pushToken) {
      if (!Notifications.isValidPushToken(pushToken)) {
        Err.throw('Invalid push token', 400)
      }
      await AuthRepo.ClearPushTokenFromOtherUsers(pushToken)
    }

    // create a new user with our schema and users details from req
    user = new User({
      first_name: Str.capitalizeFirstLetter(first_name),
      last_name: Str.capitalizeFirstLetter(last_name),
      email: email.toLowerCase(),
      email_private: false,
      password,
      auth_method: AuthUtil.jwtAuthMethod,
      auth_otp: AuthUtil.createOTP(),
      email_confirmed: false,
      push_tokens: pushToken ? [pushToken] : [],
    })

    user.password = await AuthUtil.hashUserGeneratedPW(password)

    // save the new user to DB using mongoose and send OTP email
    await Promise.all([user.save(), Redis.setUserByID(user)])

    sendEmail = user

    const payload = {
      user: {
        id: user.id,
      },
    }

    const access_token = AuthUtil.jwtSign365Days(payload)

    await Email.sendOTPEmail(sendEmail)

    Resp.json(req, res, new AuthResponse(access_token, user))
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

    const userRequested = await AuthUtil.fetchGoogleOAuthUser(token)

    const { given_name, family_name, picture, email } = userRequested.data

    let user = await AuthRepo.GetUserByEmail(email)

    if (user) {
      //USER ALREADY EXISTS, JUST LOG THEM IN

      if (!AuthUtil.isGoogleAuthMethod(user?.auth_method)) {
        Err.throw('User didnt sign up with google, please sign in with original Sign in method')
      }

      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }

        await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

        if (!user.push_tokens.includes(pushToken)) {
          await AuthRepo.SaveNewUserPushToken(user, pushToken)
        }
      }

      await Redis.setUserByID(user)

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = AuthUtil.jwtSign30Days(payload)

      Resp.json(req, res, new AuthResponse(access_token, user))
    } else {
      //NEW USER - REGISTER A NEW USER
      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }
        await AuthRepo.ClearPushTokenFromOtherUsers(pushToken)
      }

      // create a new user with our schema and users details from req
      user = new User({
        first_name: Str.capitalizeFirstLetter(given_name),
        last_name: family_name ? Str.capitalizeFirstLetter(family_name) : '',
        email: email.toLowerCase(),
        email_confirmed: true,
        email_private: false,
        avatar: picture,
        auth_method: AuthUtil.googleAuthMethod,
        push_tokens: pushToken ? [pushToken] : [],
      })

      user.password = await AuthUtil.hashServerGeneratedPW(email)

      // save the new user to DB using mongoose
      await Promise.all([user.save(), Redis.setUserByID(user)])

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = AuthUtil.jwtSign365Days(payload)

      Resp.json(req, res, new AuthResponse(access_token, user))
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

    const userRequested = await AuthUtil.verifyAppleIdToken(credential.identityToken)

    const { email, is_private_email } = userRequested

    let user = await AuthRepo.GetUserByEmail(email)

    if (user) {
      //USER ALREADY EXISTS, JUST LOG THEM IN

      if (!AuthUtil.isAppleAuthMethod(user?.auth_method)) {
        Err.throw('User didnt sign up with apple, please sign in with original Sign in method')
      }

      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }

        await AuthRepo.ClearPushTokenFromOtherUsers(pushToken, user._id)

        if (!user.push_tokens.includes(pushToken)) {
          await AuthRepo.SaveNewUserPushToken(user, pushToken)
        }
      }

      await Redis.setUserByID(user)

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = AuthUtil.jwtSign30Days(payload)

      Resp.json(req, res, new AuthResponse(access_token, user))
    } else {
      //NEW USER - REGISTER A NEW USER
      if (pushToken) {
        if (!Notifications.isValidPushToken(pushToken)) {
          Err.throw('Invalid push token', 400)
        }
        await AuthRepo.ClearPushTokenFromOtherUsers(pushToken)
      }

      // create a new user with our schema and users details from req
      user = new User({
        first_name: credential.givenName ? Str.capitalizeFirstLetter(credential.givenName) : '',
        last_name: credential.familyName ? Str.capitalizeFirstLetter(credential.familyName) : '',
        email: email.toLowerCase(),
        email_confirmed: true,
        email_private: is_private_email,
        auth_method: AuthUtil.appleAuthMethod,
        push_tokens: pushToken ? [pushToken] : [],
      })

      user.password = await AuthUtil.hashServerGeneratedPW(email)

      // save the new user to DB using mongoose
      await Promise.all([user.save(), Redis.setUserByID(user)])

      const payload = {
        user: {
          id: user.id,
        },
      }

      const access_token = AuthUtil.jwtSign365Days(payload)

      Resp.json(req, res, new AuthResponse(access_token, user))
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

    return Resp.json(req, res, SuccessResponse)
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
    user.auth_otp = AuthUtil.createOTP()
    await Promise.all([user.save(), Redis.setUserByID(user), Email.sendOTPEmail(user)])
    Resp.json(req, res, SuccessResponse)
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

    const user = await AuthRepo.GetUserByEmail(email)

    if (!user) {
      Err.throw("Sorry, we can't locate a user with this email.", 400)
    }
    if (AuthUtil.isGoogleAuthMethod(user.auth_method))
      Err.throw('This email address signed up with Google, please login via Google.', 400)

    const confirmEmailPayload = {
      email: user.email,
    }

    const token = AuthUtil.jwtSign15Mins(confirmEmailPayload)

    await Email.sendChangePasswordEmail(user, token)

    Resp.json(req, res, SuccessResponse)
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

    const decoded = AuthUtil.jwtVerify(token)

    if (!decoded?.email) {
      Err.throw('Token expired', 400)
    }

    const payload = {
      email: decoded.email,
    }

    const forward_token = AuthUtil.jwtSign15Mins(payload)

    const expires = AuthUtil.createChangePWExpiryDate()

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

    const decoded = AuthUtil.jwtVerify(token)

    if (!decoded?.email) {
      Err.throw('Token expired', 400)
    }

    const user = await AuthRepo.GetUserByEmail(decoded.email)

    if (!user) {
      Err.throw('User doesnt exist', 400)
    }

    user.password = await AuthUtil.hashUserGeneratedPW(password)

    await Promise.all([user.save(), Redis.setUserByID(user)])

    Resp.json(req, res, SuccessResponse)
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
    await AuthRepo.DeleteUserByID(user._id)
    return Resp.json(req, res, SuccessResponse)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
