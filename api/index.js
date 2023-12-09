import { Router } from 'express'
import AuthRouter from './auth/index.js'
import RestRouter from './rest/index.js'
import CustRouter from './cust/index.js'
import OptionsRouter from './options/index.js'

import PrototypeRouter from './prototype.js'
import { appEnv } from '../config/config.js'

const router = Router()

// define routes

router.use('/auth', AuthRouter)
router.use('/rest', RestRouter)
router.use('/cust', CustRouter)
router.use('/options', OptionsRouter)

if (appEnv === 'development') {
  router.use('/prototype', PrototypeRouter)
}

export default router
