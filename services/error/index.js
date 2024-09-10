import Logger from '../log/index.js'

class Err {
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
