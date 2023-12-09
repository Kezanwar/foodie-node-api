//    ___                __ __
//  .'  _.-----.-----.--|  |__.-----.
//  |   _|  _  |  _  |  _  |  |  -__|
//  |__| |_____|_____|_____|__|_____|

//defaults
import express, { json } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
import mixpanel from 'mixpanel'
import ExpressMongoSanitize from 'express-mongo-sanitize'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
//db
import connectDB from './services/db/db.js'
//api
import api from './api/index.js'
const PORT = process.env.PORT
//middlewares
import rateLimiterMiddlware from './middleware/rate-limit.js'
//crons
import runCrons from './services/crons/crons.js'

//create app
const app = express()

//initialize view engine
app.set('view engine', 'ejs')

//connect to database
connectDB()

//initialize mixpanel
mixpanel.init(process.env.MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })

//initialize middlewares
app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(rateLimiterMiddlware)
app.use(
  ExpressMongoSanitize({
    allowDots: true,
  })
)

//initialize api
app.get('/', (req, res) => res.send('Foodie API Running'))
app.use('/api', api)

//initialize crons
runCrons()

//start server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
