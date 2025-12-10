import Restaurant from '#app/models/restaurant.js'
import Location from '#app/models/location.js'
import Deal from '#app/models/deal.js'
import IMG from '#app/services/image/index.js'
import Permissions from '#app/services/permissions/index.js'

class RestaurantRepo {
  static GetByID(rest_id) {
    return Restaurant.findById(rest_id)
  }

  static GetByIDWithSuperAdmin(rest_id) {
    return Restaurant.findById(rest_id).select('+super_admin')
  }

  static async CreateNew(company_info, user) {
    const rest = new Restaurant({
      company_info,
      super_admin: user._id,
      image_uuid: IMG.createImgUUID(),
    })
    user.restaurant = { id: rest._id, role: Permissions.ROLE_SUPER_ADMIN }

    await Promise.all([rest.save(), user.save()])
    return { restaurant: rest, user: user }
  }

  static async UpdateApplication(restaurant, data) {
    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })
    await restaurant.save()
  }

  static async UpdateAccepted(restaurant, data) {
    const promises = []

    //if new data has changes that effect locations/deals
    //update locations and deals
    let dealSet = null
    let locationSet = null

    const { name, bio, cuisines, dietary_requirements, avatar, cover_photo } =
      this.#onRestUpdateCheckNewLocationAndDealDataChanges(restaurant, data)

    if (name || cuisines || dietary_requirements || avatar || cover_photo) {
      dealSet = {}
      locationSet = {}
    }

    if (name) {
      dealSet['restaurant.name'] = data.name
      locationSet['restaurant.name'] = data.name
    }

    if (avatar) {
      dealSet['restaurant.avatar'] = data.avatar
      locationSet['restaurant.avatar'] = data.avatar
    }
    if (cover_photo) {
      dealSet['restaurant.cover_photo'] = data.cover_photo
      locationSet['restaurant.cover_photo'] = data.cover_photo
    }

    if (cuisines) {
      dealSet.cuisines = data.cuisines
      locationSet.cuisines = data.cuisines
    }

    if (dietary_requirements) {
      dealSet.dietary_requirements = data.dietary_requirements
      locationSet.dietary_requirements = data.dietary_requirements
    }

    if (bio) {
      if (!locationSet) {
        locationSet = {}
      }
      locationSet['restaurant.bio'] = data.bio
    }

    if (dealSet) {
      promises.push(Deal.updateMany({ 'restaurant.id': restaurant._id }, { $set: dealSet }))
    }

    if (locationSet) {
      promises.push(Location.updateMany({ 'restaurant.id': restaurant._id }, { $set: locationSet }))
    }

    const dataArr = Object.entries(data)
    dataArr.forEach(([key, value]) => {
      restaurant[key] = value
    })

    promises.push(restaurant.save())

    await Promise.all(promises)
  }

  static GetLocations(rest_id) {
    return Location.find({ 'restaurant.id': rest_id }).select(
      '-cuisines -dietary_requirements -restaurant -active_deals -views -followers -booking_clicks'
    )
  }

  static #onRestUpdateCheckNewLocationAndDealDataChanges(restaurant, data) {
    return {
      avatar: !!data.avatar,
      cover_photo: !!data.cover_photo,
      cuisines: data.cuisines && this.#haveOptionsChanged(restaurant.cuisines, data.cuisines),
      dietary_requirements:
        data.dietary_requirements &&
        this.#haveOptionsChanged(restaurant.dietary_requirements, data.dietary_requirements),
      name: restaurant.name !== data.name,
      bio: restaurant.bio !== data.bio,
    }
  }

  static #haveOptionsChanged(currentList, newList) {
    return (
      newList.length !== currentList.length ||
      !!newList.filter((nc) => !currentList.find((rc) => rc.slug === nc.slug)).length
    )
  }
}

export default RestaurantRepo
