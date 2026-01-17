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
  let sum = 0
  for (let a of args) {
    sum = sum + a
  }
  return sum / args.length
}

// eslint-disable-next-line no-unused-vars
const buildMapFromDocArray = (arr) =>
  arr.reduce((map, obj) => {
    if (!map[obj._id]) {
      map[obj._id] = obj
    }
    return map
  }, {})

//TASKS

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
