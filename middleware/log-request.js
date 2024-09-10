import Logger from '../services/log/index.js'

const DONT_PRINT = {
  OPTIONS: true,
}

const logRequest = async (req, res, next) => {
  if (DONT_PRINT[req.method]) {
    return next()
  }
  Logger.cyan(`${req.method} --- ${req.url}`)
  return next()
}
export default logRequest
