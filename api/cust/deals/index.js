import { Router } from 'express'

import FeedRouter from './feed.js'
import SearchRouter from './search.js'
import SingleRouter from './single.js'

const router = Router()

// define routes

router.use('/feed', FeedRouter)
router.use('/search', SearchRouter)
router.use('/single', SingleRouter)

export default router
