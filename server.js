//    ___                __ __
//  .'  _.-----.-----.--|  |__.-----.
//  |   _|  _  |  _  |  _  |  |  -__|
//  |__| |_____|_____|_____|__|_____|

//defaults
import express, { json } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()
import ExpressMongoSanitize from 'express-mongo-sanitize'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT

//db
import DB from './services/db/index.js'
//crons
import Crons from './services/crons/index.js'
//redis
import Redis from './services/cache/redis.js'
//mixpanel
import Mixpanel from './services/mixpanel/index.js'
//middlewares
import rateLimiterMiddlware from './middleware/rate-limit.js'
//api
import api from './api/index.js'

//create app
const app = express()

//initialize view engine
app.set('view engine', 'ejs')

//connect to database
await DB.connect()

//connect to redis
await Redis.connect()

//connect to  mixpanel
await Mixpanel.connect()

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

//start crons
Crons.run()

//start server
app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
