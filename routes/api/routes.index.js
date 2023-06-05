import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'
import CreateRestaurantRouter from './create-restaurant/create-restaurant.index.js'
import RestaurantRouter from './restaurant/restaurant.index.js'
import LocationsRouter from './locations/locations.index.js'
import OptionsRouter from './options/options.index.js'
import DealsRouter from './deals/deals.index.js'
import PrototypeRouter from './prototype.router.js'
import { appEnv } from '../../base/base.js'

const router = Router()

// define routes

router.use('/auth', AuthRouter)
router.use('/locations', LocationsRouter)
router.use('/create-restaurant', CreateRestaurantRouter)
router.use('/restaurant', RestaurantRouter)
router.use('/options', OptionsRouter)
router.use('/deals', DealsRouter)

if (appEnv === 'development') {
  router.use('/prototype', PrototypeRouter)
}

export default router
