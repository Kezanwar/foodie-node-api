import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Permissions from '#app/services/permissions/index.js'

const restRoleGuard =
  (permissionLevel, options = {}) =>
  async (req, res, next) => {
    const { acceptedOnly, applicationOnly, getLocations } = options
    try {
      if (!Permissions.isValidPermission(permissionLevel)) {
        Err.throw('invalid permission arg', 500)
      }
      const user = req.user

      if (!user.email_confirmed) {
        Err.throw('Access denied - Please confirm your email before accessing these resources', 403)
      }

      let uRest = user?.restaurant
      let uRestID = uRest?.id
      let uRole = uRest?.role

      if (!uRest || !uRestID) {
        Err.throw('Access denied - User has no restaurant associated with them', 403)
      }

      if (!uRole) {
        Err.throw('Access denied - User has no role on this restaurant', 403)
      }

      const restaurantProm = DB.RGetRestaurantByIDWithSuperAdmin(uRestID)

      const proms = [restaurantProm]

      const locationProm = getLocations ? DB.RGetRestaurantLocations(uRestID) : null

      if (locationProm) {
        proms.push(locationProm)
      }

      const [restaurant, locations] = await Promise.all(proms)

      if (!restaurant) {
        Err.throw('Access denied - restaurant not found', 403)
      }

      if (acceptedOnly) {
        if (Permissions.isApplicationPending(restaurant.status)) {
          Err.throw('Restaurant is unable to access these resources due to current status: Pending', 401)
        }
      }

      if (applicationOnly) {
        if (!Permissions.isApplicationPending(restaurant.status)) {
          Err.throw('Restaurant is unable to access these resources due to current status: Not Pending', 401)
        }
      }

      if (!Permissions.check(permissionLevel, uRole)) {
        Err.throw("Access denied - users permissions can't access this route", 403)
      }

      req.restaurant = restaurant

      if (locations) {
        req.locations = locations
      }

      return next()
    } catch (err) {
      Err.send(res, err)
      return
    }
  }

export default restRoleGuard
