export const getPopularRestaurantsAndCuisines = (locations) => {
  const l = JSON.parse(locations)

  const cuisines = l.reduce((acc, curr) => {
    curr.restaurant.cuisines.forEach((c) => {
      if (!acc.find((el) => el.slug === c.slug)) {
        acc.push(c)
      }
    })
    return acc
  }, [])

  const sliced = l.slice(0, 6)

  for (let c of sliced) {
    delete c.restaurant.cuisines
    delete c.restaurant.dietary
  }

  return {
    restaurants: sliced,
    cuisines,
  }
}
