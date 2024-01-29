import { Router } from 'express'

import DealsRouter from './deals/index.js'
import PreferencesRouter from './preferences/index.js'
import FavouritesRouter from './favourites/index.js'
import FollowRouter from './follow/index.js'

const router = Router()

// define routes

router.use('/deals', DealsRouter)
router.use('/preferences', PreferencesRouter)
router.use('/favourites', FavouritesRouter)
router.use('/follow', FollowRouter)

export default router
