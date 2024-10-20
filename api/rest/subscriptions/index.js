import { Router } from 'express'

import NewRouter from './new.js'
import ManageRouter from './manage.js'

const router = Router()

// define routes

router.use('/new', NewRouter)
router.use('/manage', ManageRouter)

export default router
