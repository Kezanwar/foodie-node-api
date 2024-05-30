import { Router } from 'express'

import DealsRouter from './deals/index.js'
import PreferencesRouter from './preferences/index.js'
import FavouritesRouter from './favourites/index.js'
import FollowRouter from './follow/index.js'
import DiscoverRouter from './discover/index.js'
import RestaurantRouter from './restaurant/index.js'
import GeoRouter from './geo/index.js'

const router = Router()

// define routes

router.use('/deals', DealsRouter)
router.use('/preferences', PreferencesRouter)
router.use('/favourites', FavouritesRouter)
router.use('/following', FollowRouter)
router.use('/discover', DiscoverRouter)
router.use('/restaurant', RestaurantRouter)
router.use('/geo', GeoRouter)

export default router
