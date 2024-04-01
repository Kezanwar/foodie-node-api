import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

dotenv.config()

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

// router.get('/', async (req, res) => {})

export default router
