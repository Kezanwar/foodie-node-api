import { appVersion, maintenanceMode } from '#app/config/config.js'
import Err from '../services/error/index.js'

const verifyRequest = (req, res, next) => {
  try {
    const client_version = req.header('x-app-version')
    const is_native_app = req.header('x-native')

    if (is_native_app && client_version !== appVersion) {
      Err.throw(`App version is out of date, please go to the App Store an update.`, Err.CODES.APP_UPDATE_REQUIRED)
    }

    if (maintenanceMode) {
      Err.throw('Foodie is in maintenance mode', Err.CODES.MAINTENANCE_MODE)
    }

    next()
  } catch (err) {
    Err.send(req, res, err)
  }
}

export default verifyRequest
