import express, { json } from 'express'
import dotenv from 'dotenv'
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
import { getTimezonesToExpire, isoToDateNumbers } from './services/date/date.services.js'
import Voucher from './models/Voucher.js'
import { format, startOfYesterday } from 'date-fns'
import { endOfYesterday } from 'date-fns'

const app = express()

connectDB()

// init middleware
app.set('view engine', 'ejs')
app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(rateLimiterMiddlware)

app.get('/', (req, res) => res.send('Foodie API Running'))

voucherExpireCron.start()

const vouchers = await Voucher.find({ end_date: '2023-05-20' })

console.log(vouchers)

console.log(format(endOfYesterday(), 'yyyy-MM-dd'))

app.use('/api', RouterIndex)

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
