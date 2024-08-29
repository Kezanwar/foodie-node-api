//    ___                __ __
//  .'  _.-----.-----.--|  |__.-----.
//  |   _|  _  |  _  |  _  |  |  -__|
//  |__| |_____|_____|_____|__|_____|

//defaults
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

const PORT = process.env.PORT

//services
import DB from './services/db/index.js'
import Redis from './services/cache/redis.js'
import Mixpanel from './services/mixpanel/index.js'
import Notifications from './services/notifications/index.js'
import Crons from './services/crons/index.js'
import Stats from './services/stats/index.js'
import Email from './services/email/index.js'

//middlewares
import rateLimiter from './middleware/rate-limiter.js'
import bodyParser from './middleware/body-parser.js'
import mongoSanitize from './middleware/mongo-sanitize.js'

//api
import api from './api/index.js'

await DB.connect()
await Redis.connect()
await Mixpanel.connect()
Notifications.start()
Email.start()
Crons.start()
Stats.start()

//create app
const app = express()

//initialize view engine
app.set('view engine', 'ejs')

//initialize middlewares
app.use(bodyParser)
app.use(express.static(process.cwd() + '/public'))
app.use(cors())
app.use(rateLimiter)
app.use(mongoSanitize)

//initialize api
app.get('/', (req, res) => res.send('Foodie API Running'))
app.use('/api', api)

//start server
app.listen(PORT, () => console.log(`server started on port ${PORT}`))
