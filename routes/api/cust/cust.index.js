import { Router } from 'express'

import DealsRouter from './deals/deals.index.js'
import PreferencesRouter from './preferences/preferences.index.js'

const router = Router()

// define routes

router.use('/deals', DealsRouter)
router.use('/preferences', PreferencesRouter)

export default router
