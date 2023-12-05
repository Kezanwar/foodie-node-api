//    ___                __ __
//  .'  _.-----.-----.--|  |__.-----.
//  |   _|  _  |  _  |  _  |  |  -__|
//  |__| |_____|_____|_____|__|_____|

import express, { json } from 'express'
import dotenv from 'dotenv'
import mixpanel from 'mixpanel'
dotenv.config()
import connectDB from './db/db.js'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT

import cors from 'cors'
import RouterIndex from './routes/api/routes.index.js'
import rateLimiterMiddlware from './middleware/rate-limit.middleware.js'
import dealExpireCron from './crons/deal.crons.js'
import ExpressMongoSanitize from 'express-mongo-sanitize'
import Location from './models/Location.js'
import Deal from './models/Deal.js'
import User from './models/User.js'
import Restaurant from './models/Restaurant.js'
// import Deal from './models/Deal.js'
// import Location from './models/Location.js'
// import User from './models/User.js'
// import Restaurant from './models/Restaurant.js'

const app = express()

connectDB()

mixpanel.init(process.env.MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })

// init middleware
app.set('view engine', 'ejs')
app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(rateLimiterMiddlware)
app.use(
  ExpressMongoSanitize({
    allowDots: true,
  })
)

app.get('/', (req, res) => res.send('Foodie API Running'))

app.use('/api', RouterIndex)

dealExpireCron()

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
