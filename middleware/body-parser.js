import { json } from 'express'

const dontParseToJSON = {
  '/api/stripe/webhook': true,
}

const bodyParser = json({
  extended: false,
  verify: function (req, _, buf) {
    if (dontParseToJSON[req.originalUrl]) {
      req.rawBody = buf.toString()
    }
  },
})

export default bodyParser
