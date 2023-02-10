import { Router } from 'express'
import AuthRouter from './auth/auth.index.js'

const router = Router()

router.get('/', (req, res) => res.send('squib API Running'))

// define routes

router.use('/auth', AuthRouter)

export default router
