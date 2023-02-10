import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

import { join } from 'path'

// models
import User from '../../../models/User.js'

// middlewares
import auth from '../../../middleware/auth.middleware.js'
import { SendError, capitalizeFirstLetter, removeDocumentValues, getUser } from '../../utilities/utilities.js'

import { loginUserSchema, registerUserSchema } from '../../../validation/auth.validation.js'

import { JWT_SECRET } from '../../../constants/auth.js'
import validate from '../../../middleware/validation.middleware.js'
import transporter, { getEmailOptions } from '../../../emails/emails.nodemailer.js'
import { confirm_email_content } from '../../../emails/emails.content.js'

// route GET api/auth
// @desc GET A LOGGED IN USER WITH JWT
// @access private
router.get('/', auth, async (req, res) => {
  try {
    const user = await getUser(req.user.id)
    if (!user) throw new Error('User doesnt exist')
    res.json({ user })
  } catch (error) {
    SendError(res, error)
  }
})

// route POST api/auth
// @desc Authenticate and log in a user and send token
// @access public

router.post(
  '/login',
  //   middleware validating the req.body using express-validator
  validate(loginUserSchema),
  async (req, res) => {
    try {
      // generating errors from validator and handling them with res
      // destructuring from req.body
      const { email, password } = req.body
      // checking if user doesnt exist, if they dont then send err
      let user = await User.findOne({ email: email }).select('+password')

      if (!user) {
        throw new Error('Invalid credentials')
      }

      // compare the passwords if they exist

      const isMatch = await bcrypt.compare(password, user.password)

      // if dont exist send an error

      if (!isMatch) {
        throw new Error('Invalid credentials')
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
        // res.cookie('authCookie', JSON.stringify(token), {
        //   secure: process.env.APP_ENV !== 'development',
        //   httpOnly: true,
        //   expires: 360000,
        // })
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

// route POST api/users
// @desc register user - uses express validator middleware to check the userinfo posted to see if there are any errors and handle them, else create new user in the db, returns a token and user
// @access public

router.post('/register', validate(registerUserSchema), async (req, res) => {
  // generating errors from validator and handling them with res

  try {
    // destructuring from req.body
    const { first_name, last_name, email, password } = req.body

    // checking if user exists, if they do then send err
    let user = await User.findOne({ email: email })

    if (user) throw new Error('User already exists')

    const display_name = capitalizeFirstLetter(first_name) + ' ' + capitalizeFirstLetter(last_name)

    // create a new user with our schema and users details from req
    user = new User({
      first_name,
      last_name,
      email,
      password,
      display_name,
    })
    // encrypt users passsord using bcrypt
    // generate the salt
    const salt = await bcrypt.genSalt(10)
    // encrypt users password with the salt
    user.password = await bcrypt.hash(password, salt)

    // save the new user to DB using mongoose
    await user.save()

    //  call jwt sign method, pass in the email and send an email to confirm their email address

    const confirmEmailPayload = {
      email: user.email,
    }

    jwt.sign(confirmEmailPayload, JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
      if (err) throw new Error(err)
      const { title, description } = confirm_email_content
      const emailOptions = getEmailOptions(user.email, 'Confirm your email address!', 'action-email', {
        user_name: user.first_name,
        title: title,
        description: description,
        action_text: 'Confirm email',
        action_href: `http://localhost:5006/api/auth/confirm-email/${token}`,
      })
      transporter.sendMail(emailOptions, (err, info) => {
        if (err) console.log(err)
        else console.log('email sent' + ' ' + info.response)
      })
    })

    //  call jwt sign method, poss in the payload, the jwtsecret from our config we created, an argument for optional extra parameters such as expiry, a call back function which allows us to handle any errors that occur or send the response back to user.
    const authIdPayload = {
      user: {
        id: user.id,
      },
    }

    jwt.sign(authIdPayload, JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
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
})

// route GET api/auth/confirm-mail/:token
// @desc CONFIRM EMAIL ADDRESS
// @access private
router.get('/confirm-email/:token', async (req, res) => {
  try {
    const { token } = req.params

    if (!token) throw new Error('Unexpected error')

    const decoded = jwt.verify(token, JWT_SECRET)
    const email = decoded.email

    if (!email) throw new Error('Email address not recognized')

    const user = await User.findOne({ email: email })

    if (!user) throw new Error('User doesnt exist')

    user.email_confirmed = true

    user.save()

    res.sendFile(join(process.cwd(), 'public/email-confirmed.html'))
  } catch (error) {
    SendError(res, error)
  }
})

// route POST api/auth/resend-confirm-email
// @desc CONFIRM EMAIL ADDRESS
// @access private
router.post('/resend-confirm-email', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    if (!user) throw new Error('User doesnt exist')
    const confirmEmailPayload = {
      email: user.email,
    }

    jwt.sign(confirmEmailPayload, JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
      if (err) throw new Error(err)

      const { title, description } = confirm_email_content
      const emailOptions = getEmailOptions(user.email, 'Confirm your email address!', 'action-email', {
        user_name: user.first_name,
        title: title,
        description: description,
        action_text: 'Confirm email',
        action_href: `http://localhost:5006/api/auth/confirm-email/${token}`,
      })
      transporter.sendMail(emailOptions, (err, info) => {
        if (err) console.log(err)
        else console.log('email sent' + ' ' + info.response)
      })
    })
    res.status(200).send({ message: 'success' })
  } catch (error) {
    SendError(res, error)
  }
})

// route GET api/auth
// @desc RESET PASSWORD
// @access private
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) throw new Error('No email attached')
    const user = await User.findOne({ email: email })
    if (!user) throw new Error('Email address doesnt exist')

    const confirmEmailPayload = {
      email: user.email,
    }

    jwt.sign(confirmEmailPayload, JWT_SECRET, { expiresIn: 360000 }, async (err, token) => {
      if (err) throw new Error(err)

      const { title, description } = confirm_email_content
      const emailOptions = getEmailOptions(user.email, 'Confirm your email address!', 'action-email', {
        user_name: user.first_name,
        title: title,
        description: description,
        action_text: 'Confirm email',
        action_href: `http://localhost:5006/api/auth/confirm-email/${token}`,
      })
      transporter.sendMail(emailOptions, (err, info) => {
        if (err) console.log(err)
        else console.log('email sent' + ' ' + info.response)
      })
    })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
