export const filterDealsByDistance = (deals, distance) =>
  JSON.parse(deals).filter((deal) => deal.location.distance_miles <= distance)

export const hasFavouritedDealAndFollowedRest = (user, deal_id, location_id) => {
  const u = JSON.parse(user)
  const is_following = !!u.following.find((follow) => follow.location_id === location_id)

  const is_favourited = !!u.favourites.find(
    (favourite) => favourite.deal === deal_id && favourite.location_id === location_id
  )

  return { is_favourited, is_following }
}
