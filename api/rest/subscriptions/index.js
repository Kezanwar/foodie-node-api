import { Router } from 'express'
import NewRouter from './new.js'

const router = Router()

// define routes

router.use('/new', NewRouter)

export default router
