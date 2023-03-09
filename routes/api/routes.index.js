import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'
import TestRouter from './test/test.js'
import CreateRestaurantRouter from './create-restaurant/create-restaurant.index.js'

const router = Router()

// define routes

router.use('/auth', AuthRouter)
router.use('/test', TestRouter)
router.use('/create-restaurant', CreateRestaurantRouter)

export default router
