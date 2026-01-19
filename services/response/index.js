import Logger from '../log/index.js'
import HttpResponse from './http-response.js'

class Resp {
  static json(req, res, data) {
    if (data instanceof HttpResponse) {
      const responseData = data.buildResponse()
      res.status(200).json(responseData)
      Logger.green(`200 --- ${req.originalUrl}`)
    } else {
      // Legacy support: send raw data
      res.status(200).json(data)
      Logger.green(`200 --- ${req.originalUrl}`)
    }
  }
}

export default Resp
