import express, { json } from 'express'
import dotenv from 'dotenv'
dotenv.config()
import connectDB from './db/db.js'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT
// import { worker } from './workers/worker.js'

import cors from 'cors'
import RouterIndex from './routes/api/routes.index.js'
import rateLimiterMiddlware from './middleware/rate-limit.middleware.js'

const app = express()

connectDB()

// init middleware
app.set('view engine', 'ejs')
app.use(json({ extended: false }))
app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(rateLimiterMiddlware)

app.get('/', (req, res) => res.send('Foodie API Running'))

app.use('/api', RouterIndex)

// Run the "add" function on a separate thread and wait
// for it to complete before moving forward.
// const result = await worker({
// Provide the name of the task.
// name: 'add',
// Provide the parameters of the function.
// params: [2, 3],
// })

// The result is sent back to the parent thread
// and resolved by the task function call.
// console.log(result)
// -> 5

app.listen(PORT, () => console.log(`Server started on port ${PORT}`))
