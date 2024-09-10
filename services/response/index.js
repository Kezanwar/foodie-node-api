import Logger from '../log/index.js'

class Resp {
  static json(req, res, data) {
    res.status(200).json(data)
    Logger.green(`200 --- ${req.originalUrl}`)
  }
}

export default Resp
