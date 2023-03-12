import { RESTAURANT_ROLES } from '../constants/restaurant.js'
import Restaurant from '../models/Restaurant.js'
import { SendError } from '../routes/utilities/utilities.js'

const restRoleGuard = (role) => async (req, res, next) => {
  try {
    if (!role || !Object.values(RESTAURANT_ROLES).some((rRole) => role === rRole)) {
      throw new Error('restRoleGuard middleware expects a restaurant role as the argument')
    }
    const user = req.user

    let uRest = user?.restaurant
    let uRestID = uRest?.id
    let uRole = uRest?.role

    if (!uRest || !uRestID) {
      throw new Error('Access denied - User has no restaurant associated with them')
    }

    if (!uRole) throw new Error('Access denied - User has no role on this restaurant')

    const restaurant = await Restaurant.findById(uRestID).select('+super_admin')

    if (!restaurant) throw new Error('Access denied - restaurant not found')

    let canAccess

    switch (role) {
      case RESTAURANT_ROLES.SUPER_ADMIN:
        canAccess = uRole === RESTAURANT_ROLES.SUPER_ADMIN && restaurant.super_admin.toString() === user.id
        break
      case RESTAURANT_ROLES.ADMIN:
        canAccess =
          (uRole === RESTAURANT_ROLES.SUPER_ADMIN && restaurant.super_admin.toString() === user.id) ||
          (uRole === RESTAURANT_ROLES.ADMIN && restaurant.admins.some((admin) => admin.toString() === user.id))
        break
      case RESTAURANT_ROLES.USER:
        canAccess = canAccess =
          (uRole === RESTAURANT_ROLES.SUPER_ADMIN && restaurant.super_admin.toString() === user.id) ||
          (uRole === RESTAURANT_ROLES.ADMIN && restaurant.admins.some((admin) => admin.toString() === user.id)) ||
          (uRole === RESTAURANT_ROLES.USER && restaurant.users.some((u) => u.toString() === user.id))
        break
      default:
        canAccess = false
        break
    }

    if (canAccess) {
      req.restaurant = restaurant
      return next()
    }
    // eslint-disable-next-line quotes
    else throw new Error("Access denied - users permissions can't access this route")
  } catch (err) {
    SendError(res, err)
    return
  }
}

export default restRoleGuard
