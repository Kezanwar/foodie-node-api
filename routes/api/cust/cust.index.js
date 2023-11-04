import { Router } from 'express'

import DealsRouter from './deals/deals.index.js'

const router = Router()

// define routes

router.use('/deals', DealsRouter)

export default router
