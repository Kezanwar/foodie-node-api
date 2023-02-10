import { Router } from 'express'
const router = Router()

// const jwt = require('jsonwebtoken')
// const bcrypt = require('bcryptjs')

// models
import { find } from '../../../models/User'

// middlewares
// const auth = require('../../../middleware/auth')
import { SendError } from '../../utilities/utilities'
// const transporter = require('../../../emails/nodeMailer')
// const {
//   HeaderAndActionButtonEmailTemplate,
// } = require('../../../emails/templates/headerAndActionButton/HeaderAndActionButtonEmailTemplate')
// const path = require('path')

router.get('/test-find-email/:email', async (req, res) => {
  try {
    const { email } = req.params
    if (!email) throw new Error('No email attached')
    const user = await find({ email: email }).explain()
    res.json(user)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
