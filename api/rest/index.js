import { Router } from 'express'

import CreateRestaurantRouter from './create-restaurant/index.js'
import RestaurantRouter from './restaurant/index.js'
import LocationsRouter from './locations/index.js'
import DealsRouter from './deals/index.js'
import DashboardRouter from './dashboard/index.js'
import SubscriptionsRouter from './subscriptions/index.js'

const router = Router()

// define routes

router.use('/locations', LocationsRouter)
router.use('/create-restaurant', CreateRestaurantRouter)
router.use('/restaurant', RestaurantRouter)
router.use('/deals', DealsRouter)
router.use('/dashboard', DashboardRouter)
router.use('/subscriptions', SubscriptionsRouter)

export default router
