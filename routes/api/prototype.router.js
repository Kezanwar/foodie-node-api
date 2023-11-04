import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

// import Restaurant from '../../models/Restaurant.js'
// import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../constants/restaurant.js'

// import auth from '../../middleware/auth.middleware.js'
// import validate from '../../middleware/validation.middleware.js'
// import restRoleGuard from '../../middleware/rest-role-guard.middleware.js'÷
import { SendError, capitalizeFirstLetter, createOTP, throwErr } from '../utilities/utilities.js'

import Deal from '../../models/Deal.js'
import { renderFile } from 'ejs'
import { confirm_email_content, email_addresses } from '../../constants/email.js'

import transporter from '../../services/email/email.services.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

// router.get('/', async (req, res) => {
//   try {
//     return res.render('emails/action-email', {
//       content: confirm_email_content.description,
//       title: confirm_email_content.title,
//       list: ['helo', 'helllo'],
//       action_primary: { text: 'Accept', url: feUrl },
//       action_secondary: { text: 'Decline', url: feUrl },
//       receiver: capitalizeFirstLetter('kez'),
//     })
//   } catch (error) {
//     SendError(res, error)
//   }
// })

// router.post('/', async (req, res) => {
//   const LIMIT = 10

//   try {
//     const results = await Deal.find({
//       is_expired: false,
//       'locations.geometry.coordinates': {
//         $near: {
//           $geometry: {
//             type: 'Point',
//             coordinates: [-2.23535, 53.41724],
//           },
//           $maxDistance: 4000,
//           $minDistance: 0,
//         },
//       },
//     })
//       .limit(LIMIT)
//       .skip()
//     return res.json(results)
//   } catch (error) {
//     SendError(res, error)
//   }
// })

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

export default router
