import { Router } from 'express'

import FeedRouter from './deals.feed.js'
import SearchRouter from './deals.search.js'

const router = Router()

// define routes

router.use('/feed', FeedRouter)
router.use('/search', SearchRouter)

export default router
