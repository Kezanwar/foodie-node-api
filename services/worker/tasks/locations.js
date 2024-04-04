import { countries } from '#app/constants/countries.js'

export const editDealFindLocationsToAddRemoveAndUpdate = (deal, newDealLocationIds) => {
  const deseraialized = JSON.parse(deal)

  const remove = deseraialized.locations.reduce((acc, oldL) => {
    if (!newDealLocationIds.find((newL) => oldL.location_id === newL)) {
      acc.push(oldL.location_id)
    }
    return acc
  }, [])
  const add = newDealLocationIds.reduce((acc, newL) => {
    if (!deseraialized.locations.find((oldL) => oldL.location_id === newL)) {
      acc.push(newL)
    }
    return acc
  }, [])
  const update = newDealLocationIds.reduce((acc, newL) => {
    if (!remove.find((removeL) => removeL === newL)) {
      if (!add.find((addL) => addL === newL)) {
        acc.push(newL)
      }
    }
    return acc
  }, [])

  return { remove, add, update }
}

export function findCountryPhoneCode(country) {
  const code = countries.find((c) => c.label === country)?.phone
  return `+${code}`
}
