export const parseRecentlyViewedStatsIntoDealViews = (stats, user) => {
  const u = JSON.parse(user)
  const s = JSON.parse(stats)
  const map = {}
  Object.entries(s).forEach(([key, count]) => {
    const [deal_id, location_id] = key.split('--')
    if (!map[deal_id]) {
      map[deal_id] = []
    }
    for (let i = 0; i <= count - 1; i++) {
      map[deal_id].push({ user: u._id, user_geo: u.geometry.coordinates, location_id })
    }
  })
  return map
}
