import { expAsPerc } from './numbers.js'
import { getStringSimilarity } from './strings.js'

export const filterDealsByDistance = (deals, distance) =>
  JSON.parse(deals).filter((deal) => deal.location.distance_miles <= distance)

export const checkSingleDealFollowAndFav = (user, deal_id, location_id) => {
  const u = JSON.parse(user)
  const is_following = !!u.following.find((follow) => follow.location_id === location_id)

  const is_favourited = !!u.favourites.find(
    (favourite) => favourite.deal === deal_id && favourite.location_id === location_id
  )

  return { is_favourited, is_following }
}

export const checkSingleRestaurantFollowAndFav = (user, location) => {
  const u = JSON.parse(user)
  const l = JSON.parse(location)

  if (l?.active_deals) {
    l.active_deals = l.active_deals.map((deal) => {
      return {
        ...deal,
        is_favourited: !!u.favourites.find(
          (favourite) => favourite.deal === deal._id && favourite.location_id === l._id
        ),
      }
    })
  }

  l.is_following = !!u.following.find((follow) => follow.location_id === l._id)

  return l
}

export const orderSearchDealsByTextMatchRelevance = (deals, search) => {
  const parsedDeals = JSON.parse(deals)
  const sorted = []

  const restuarant_map = {}

  for (let d of parsedDeals) {
    const deal_name = getStringSimilarity(search, d.deal.name)

    if (deal_name > 0.95) {
      d.match = deal_name
    } else {
      const deal_description = getStringSimilarity(search, d.deal.description)

      if (deal_description > 0.95) {
        d.match = deal_description
      } else {
        if (!restuarant_map?.[d.restaurant.id]) {
          restuarant_map[d.restaurant.id] = {
            cuisine: getCuisineDietaryMatch(search, d.restaurant.cuisines),
            dietary: getCuisineDietaryMatch(search, d.restaurant.dietary),
          }
        }

        d.match = expAsPerc(
          deal_name,
          deal_description,
          getStringSimilarity(search, d.restaurant.bio),
          getStringSimilarity(search, d.restaurant.name),
          restuarant_map[d.restaurant.id].cuisine,
          restuarant_map[d.restaurant.id].dietary
        )
      }
    }

    delete d.restaurant.bio
    delete d.restaurant.cuisines
    delete d.restaurant.dietary

    if (sorted[0]?.match > d.match) {
      sorted.push(d)
    } else sorted.unshift(d)
  }

  return sorted
}

const getCuisineDietaryMatch = (search, arr) => {
  return arr.reduce((acc, curr) => {
    const calc = getStringSimilarity(search, curr.name)
    if (acc < calc) {
      acc = calc
    }
    return acc
  }, 0)
}
