export const parseAppUserStatsForSyncing = (stats, user) => {
  const u = JSON.parse(user)
  const s = JSON.parse(stats)
  const { deals, locations, booking_clicks } = s

  const map = {
    dealViews: [],
    locationViews: [],
    locationBookingClicks: [],
  }

  Object.entries(deals).forEach(([key, count]) => {
    const [deal_id, location_id] = key.split('--')

    for (let i = 0; i <= count - 1; i++) {
      map.dealViews.push({ user_id: u._id, user_geo: u.geometry.coordinates, location_id, deal_id })
    }
  })

  Object.entries(locations).forEach(([location_id, count]) => {
    for (let i = 0; i <= count - 1; i++) {
      map.locationViews.push({
        user_id: u._id,
        location_id: location_id,
        user_geo: u.geometry.coordinates,
      })
    }
  })

  Object.entries(booking_clicks).forEach(([location_id, count]) => {
    for (let i = 0; i <= count - 1; i++) {
      map.locationBookingClicks.push({
        user_id: u._id,
        location_id: location_id,
        user_geo: u.geometry.coordinates,
      })
    }
  })

  return map
}
