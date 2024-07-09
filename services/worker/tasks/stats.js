export const parseAppUserStatsForSyncing = (stats, user) => {
  const u = JSON.parse(user)
  const s = JSON.parse(stats)
  const { deals, locations, booking_clicks } = s

  const map = {
    deals: {},
    locations: {},
  }

  Object.entries(deals).forEach(([key, count]) => {
    const [deal_id, location_id] = key.split('--')
    if (!map.deals[deal_id]) {
      map.deals[deal_id] = []
    }
    for (let i = 0; i <= count - 1; i++) {
      map.deals[deal_id].push({ user: u._id, user_geo: u.geometry.coordinates, location_id })
    }
  })

  Object.entries(locations).forEach(([location_id, count]) => {
    if (!map.locations[location_id]) {
      map.locations[location_id] = {
        views: [],
      }
    }
    for (let i = 0; i <= count - 1; i++) {
      map.locations[location_id].views.push({ user: u._id, user_geo: u.geometry.coordinates })
    }
  })

  Object.entries(booking_clicks).forEach(([location_id, count]) => {
    if (!map.locations[location_id]) {
      map.locations[location_id] = {
        booking_clicks: [],
      }
    }

    if (!map.locations[location_id].booking_clicks) {
      map.locations[location_id].booking_clicks = []
    }

    for (let i = 0; i <= count - 1; i++) {
      map.locations[location_id].booking_clicks.push({ user: u._id, user_geo: u.geometry.coordinates })
    }
  })

  return map
}
