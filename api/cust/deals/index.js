import { Router } from 'express'

import FeedRouter from './feed.js'
import SearchRouter from './search.js'

const router = Router()

// define routes

router.use('/feed', FeedRouter)
router.use('/search', SearchRouter)

export default router
