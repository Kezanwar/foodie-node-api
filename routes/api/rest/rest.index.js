import { Router } from 'express'

import CreateRestaurantRouter from './create-restaurant/create-restaurant.index.js'
import RestaurantRouter from './restaurant/restaurant.index.js'
import LocationsRouter from './locations/locations.index.js'
import DealsRouter from './deals/deals.index.js'
import DashboardRouter from './dashboard/dashboard.index.js'

const router = Router()

// define routes

router.use('/locations', LocationsRouter)
router.use('/create-restaurant', CreateRestaurantRouter)
router.use('/restaurant', RestaurantRouter)
router.use('/deals', DealsRouter)
router.use('/dashboard', DashboardRouter)

export default router
