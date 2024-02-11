import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

// import Restaurant from '../../models/Restaurant.js'
// import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../constants/restaurant.js'

// import auth from '../../middleware/auth.middleware.js'
// import validate from '../../middleware/validation.middleware.js'
// import restRoleGuard from '../../middleware/rest-role-guard.middleware.js'÷

// import Deal from '../../models/Deal.js'
import { renderFile } from 'ejs'
import { confirm_email_content, email_addresses } from '#app/constants/email.js'

import transporter from '#app/services/email/index.js'
import { createOTP } from '#app/utilities/otp.js'
import { SendError, throwErr } from '#app/utilities/error.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.post('/', async (req, res) => {
  try {
    renderFile(
      process.cwd() + '/views/emails/action-email.ejs',
      {
        content: `${confirm_email_content.description} \n 
        <p class="otp"><strong>${createOTP()}</strong><p>`,
        title: confirm_email_content.title,
        receiver: 'Kez Anwar',
      },
      (err, data) => {
        if (err) {
          throwErr('error creating enmail email')
        } else {
          const mainOptions = {
            from: email_addresses.noreply,
            to: 'kezanwar@gmail.com',
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
    return res.json('success')
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/', async (req, res) => {
  try {
    return res.render('pages/change-password')
  } catch (error) {
    SendError(res, error)
  }
})

export default router
