import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'
import CreateRestaurantRouter from './create-restaurant/create-restaurant.index.js'
import RestaurantRouter from './restaurant/restaurant.index.js'
import LocationsRouter from './locations/locations.index.js'
import OptionsRouter from './options/options.index.js'

import TestRouter from './test/test.js'

const router = Router()

// define routes
router.use('/test', TestRouter)

router.use('/auth', AuthRouter)
router.use('/locations', LocationsRouter)
router.use('/create-restaurant', CreateRestaurantRouter)
router.use('/restaurant', RestaurantRouter)

router.use('/options', OptionsRouter)

export default router
