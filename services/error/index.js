import Logger from '../log/index.js'

class Err {
  static CODES = {
    TOKEN_EXPIRED: 499,
    APP_UPDATE_REQUIRED: 489,
    MAINTENANCE_MODE: 599,
  }
  static throw(msg, code) {
    const exception = new Error(msg)
    exception.code = code ?? 500
    exception.from_admin = true
    throw exception
  }
  static send(req, res, err) {
    const code = err?.code ?? 500
    Logger.red(err)
    Logger.red(`${code} --- ${req.originalUrl}`)

    res
      .status(code)
      .json({ message: err?.from_admin ? err?.message || 'Internal server error' : 'Internal server error' })
  }
  static log(err) {
    console.error(err)
  }
}

export default Err
