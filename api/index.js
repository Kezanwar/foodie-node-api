import { Router } from 'express'

import AuthRouter from './auth/index.js'
import AccountRouter from './account/index.js'
import RestRouter from './rest/index.js'
import CustRouter from './cust/index.js'
import OptionsRouter from './options/index.js'
import StripeRouter from './stripe/index.js'

const router = Router()

// define routes

router.use('/auth', AuthRouter)
router.use('/account', AccountRouter)
router.use('/rest', RestRouter)
router.use('/cust', CustRouter)
router.use('/options', OptionsRouter)
router.use('/stripe', StripeRouter)

export default router
