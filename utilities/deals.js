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
    l.active_deals = l.active_deals.map((id) => {
      return {
        id,
        is_favourited: !!u.favourites.find((favourite) => favourite.deal === id && favourite.location_id === l._id),
      }
    })
  }

  l.is_following = !!u.following.find((follow) => follow.location_id === l._id)

  return l
}
