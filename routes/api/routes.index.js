import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'
import RestRouter from './rest/rest.index.js'
import CustRouter from './cust/cust.index.js'
import OptionsRouter from './options/options.index.js'

import PrototypeRouter from './prototype.router.js'
import { appEnv } from '../../base/base.js'

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
