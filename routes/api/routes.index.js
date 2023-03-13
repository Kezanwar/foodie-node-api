import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'
import CreateRestaurantRouter from './create-restaurant/create-restaurant.index.js'
import LocationsRouter from './locations/locations.index.js'

import TestRouter from './test/test.js'

const router = Router()

// define routes
router.use('/test', TestRouter)

router.use('/auth', AuthRouter)
router.use('/locations', LocationsRouter)
router.use('/create-restaurant', CreateRestaurantRouter)

export default router
