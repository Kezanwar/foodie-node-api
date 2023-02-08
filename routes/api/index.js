const express = require('express')
const router = express.Router()

router.get('/', (req, res) => res.send('squib API Running'))

// define routes

router.use('/auth', require('./auth/index'))

module.exports = router
