export const filterDealsByDistance = (deals, distance) =>
  JSON.parse(deals).filter((deal) => deal.location.distance_miles <= distance)
