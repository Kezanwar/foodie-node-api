export const userFollowsRestaurant = (user, location_id) => {
  const u = JSON.parse(user)
  return !!u.following.find((loc) => loc === location_id)
}

export const userHasFavouritedDeal = (user, deal_id, location_id) => {
  const u = JSON.parse(user)
  return !!u.favourites.find((fav) => fav.deal === deal_id && fav.location_id === location_id)
}
