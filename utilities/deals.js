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
  for (let d of parsedDeals) {
    d.match = Math.max(getStringSimilarity(search, d.deal.name), getStringSimilarity(search, d.deal.description))
    if (!sorted.length || sorted[sorted.length - 1].match > d.match) {
      sorted.push(d)
    } else sorted.unshift(d)
  }
  return sorted
}
