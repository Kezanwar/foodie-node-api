import { RESTAURANT_ROLES, RESTAURANT_STATUS } from '#app/constants/restaurant.js'
import Restaurant from '#app/models/Restaurant.js'
import Err from '#app/services/error/index.js'
import { findRestaurantsLocations } from '#app/utilities/locations.js'

const restRoleGuard =
  (role, options = {}) =>
  async (req, res, next) => {
    try {
      if (!role || !Object.values(RESTAURANT_ROLES).some((rRole) => role === rRole)) {
        Err.throw('restRoleGuard middleware expects a restaurant role as the argument', 500)
      }
      const user = req.user

      if (!user.email_confirmed)
        Err.throw('Access denied - Please confirm your email before accessing these resources', 403)

      let uRest = user?.restaurant
      let uRestID = uRest?.id
      let uRole = uRest?.role

      if (!uRest || !uRestID) {
        Err.throw('Access denied - User has no restaurant associated with them', 403)
      }

      if (!uRole) Err.throw('Access denied - User has no role on this restaurant', 403)

      const restaurantProm = Restaurant.findById(uRestID).select('+super_admin')

      const proms = [restaurantProm]

      const locationProm = options?.getLocations ? findRestaurantsLocations(uRestID) : null

      if (locationProm) proms.push(locationProm)

      const [restaurant, locations] = await Promise.all(proms)

      if (!restaurant) Err.throw('Access denied - restaurant not found', 403)

      const { acceptedOnly, applicationOnly } = options

      if (applicationOnly) {
        switch (restaurant.status) {
          case RESTAURANT_STATUS.APPLICATION_ACCEPTED:
          case RESTAURANT_STATUS.APPLICATION_REJECTED:
          case RESTAURANT_STATUS.LIVE:
          case RESTAURANT_STATUS.DISABLED:
          case RESTAURANT_STATUS.APPLICATION_PROCESSING:
            Err.throw('Unable to access these resources', 401)
            break
          default:
            break
        }
      }

      if (acceptedOnly) {
        switch (restaurant.status) {
          case undefined:
          case '':
          case RESTAURANT_STATUS.APPLICATION_PROCESSING:
          case RESTAURANT_STATUS.APPLICATION_REJECTED:
          case RESTAURANT_STATUS.APPLICATION_PENDING:
            Err.throw('Unable to access these resources', 401)
            break
          default:
            break
        }
      }

      let canAccess

      const isSuperAdmin = !!(restaurant?.super_admin.toString() === user.id)
      const isAdmin = !!restaurant?.admins?.some((admin) => admin?.toString() === user.id)
      const isUser = !!restaurant?.users?.some((u) => u?.toString() === user.id)

      switch (role) {
        case RESTAURANT_ROLES.SUPER_ADMIN:
          canAccess = uRole === RESTAURANT_ROLES.SUPER_ADMIN && isSuperAdmin
          break
        case RESTAURANT_ROLES.ADMIN:
          canAccess =
            (uRole === RESTAURANT_ROLES.SUPER_ADMIN && isSuperAdmin) || (uRole === RESTAURANT_ROLES.ADMIN && isAdmin)
          break
        case RESTAURANT_ROLES.USER:
          canAccess = canAccess =
            (uRole === RESTAURANT_ROLES.SUPER_ADMIN && isSuperAdmin) ||
            (uRole === RESTAURANT_ROLES.ADMIN && isAdmin) ||
            (uRole === RESTAURANT_ROLES.USER && isUser)
          break
        default:
          canAccess = false
          break
      }

      if (!canAccess) {
        // eslint-disable-next-line quotes
        Err.throw("Access denied - users permissions can't access this route", 403)
      } else if (canAccess) {
        if (locations) {
          req.locations = locations
        }
        req.restaurant = restaurant
        return next()
      }
      // eslint-disable-next-line quotes
      else Err.throw('Unexpected error: Please contact Foodie Admin')
    } catch (err) {
      Err.send(res, error)
      return
    }
  }

export default restRoleGuard
