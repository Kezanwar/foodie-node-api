import express, { json } from 'express'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './db/db.js'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT
// const APP_ENV = process.env.APP_ENV
import cors from 'cors'
import RouterIndex from './routes/api/routes.index.js'
import rateLimiterMiddlware from './middleware/rate-limit.middleware.js'

const app = express()

connectDB()

// init middleware

app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(rateLimiterMiddlware)

app.get('/', (req, res) => res.send('Foodie API Running'))

app.use('/api', RouterIndex)

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
