import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

// import Restaurant from '../../models/Restaurant.js'
// import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES } from '../../constants/restaurant.js'

// import auth from '../../middleware/auth.middleware.js'
// import validate from '../../middleware/validation.middleware.js'
// import restRoleGuard from '../../middleware/rest-role-guard.middleware.js'÷
import { SendError, capitalizeFirstLetter } from '../utilities/utilities.js'
import { feUrl } from '../../base/base.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.get('/', async (req, res) => {
  try {
    // return res.sendFile(join(process.cwd(), 'public/email-confirmed.html'))
    return res.render('pages/email-confirmed', { loginUrl: feUrl, first_name: capitalizeFirstLetter('kez') })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
