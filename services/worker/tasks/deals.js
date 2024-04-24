import levenshtein from '#app/utilities/levenshtein.js'

//UTILS
const getOptionMatch = (search, arr) => {
  return arr.reduce((acc, curr) => {
    const calc = levenshtein(search, curr.name)
    if (acc < calc) {
      acc = calc
    }
    return acc
  }, 0)
}

const expAsPerc = (...args) => {
  const arg = [...args]
  let sum = 0
  for (let a of arg) {
    sum = sum + a
  }
  return sum / arg.length
}

//TASKS
export const checkSingleDealFollowAndFav = (user, deal_id, location_id) => {
  const u = JSON.parse(user)
  const is_following = !!u.following.find((follow) => follow === location_id)

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

  l.is_following = !!u.following.find((follow) => follow === l._id)

  return l
}

export const orderSearchDealsByTextMatchRelevance = (deals, search) => {
  const parsedDeals = JSON.parse(deals)
  const sorted = []

  const restuarant_map = {}

  for (let d of parsedDeals) {
    const deal_name = levenshtein(search, d.deal.name)

    if (deal_name > 0.6) {
      d.match = deal_name
    } else {
      const deal_description = levenshtein(search, d.deal.description)

      if (deal_description > 0.6) {
        d.match = deal_description
      } else {
        if (!restuarant_map?.[d.restaurant.id]) {
          restuarant_map[d.restaurant.id] = {
            cuisine: getOptionMatch(search, d.restaurant.cuisines),
            dietary: getOptionMatch(search, d.restaurant.dietary),
          }
        }

        d.match = expAsPerc(
          deal_name,
          deal_description,
          levenshtein(search, d.restaurant.bio),
          levenshtein(search, d.restaurant.name),
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
    } else {
      sorted.unshift(d)
    }
  }

  return sorted
}
