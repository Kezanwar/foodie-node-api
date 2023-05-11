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
import voucherExpireCron from './crons/voucher.crons.js'
import { getTimezonesToExpire } from './services/date/date.services.js'

const app = express()

connectDB()

mixpanel.init(process.env.MIXPANEL_TOKEN, { host: 'api-eu.mixpanel.com' })

// init middleware
app.set('view engine', 'ejs')
app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))

app.use(cors())
app.use(rateLimiterMiddlware)

app.get('/', (req, res) => res.send('Foodie API Running'))

app.use('/api', RouterIndex)

voucherExpireCron()

console.log(getTimezonesToExpire())

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
