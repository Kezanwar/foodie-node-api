import pkg from 'lodash'
import WorkerService from '#app/services/worker/index.js'
import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()
const { upperCase, omit, capitalize } = pkg

class LocationService {
  getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
  }

  shortPostocde(postcode) {
    return upperCase(postcode).split(' ').join('')
  }

  createAddDealLocations(restaurantLocations, newDealLocationsIds) {
    return newDealLocationsIds.reduce((acc, curr) => {
      const location = restaurantLocations.find((rL) => this.getID(rL) === curr)
      if (location) {
        acc.push({ location_id: curr, geometry: location.geometry, nickname: location.nickname })
      }
      return acc
    }, [])
  }

  editDealFindLocationsToAddRemoveAndUpdate(deal, newDealLocationIds) {
    const remove = deal.locations.reduce((acc, oldL) => {
      if (!newDealLocationIds.find((newL) => oldL.location_id.toHexString() === newL)) {
        acc.push(oldL.location_id)
      }
      return acc
    }, [])
    const add = newDealLocationIds.reduce((acc, newL) => {
      if (!deal.locations.find((oldL) => oldL.location_id.toHexString() === newL)) {
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

  checkIfAddLocationAlreadyExists(locations, address) {
    return locations.some((l) => this.shortPostocde(l.address.postcode) === this.shortPostocde(address.postcode))
  }

  checkIfEditLocationAlreadyExists(locations, id, address) {
    return locations.some(
      (l) => this.getID(l) !== id && this.shortPostocde(l.address.postcode) === this.shortPostocde(address.postcode)
    )
  }

  findLocationToEdit(locations, id) {
    return locations.find((l) => this.getID(l) === id)
  }

  findCountryPhoneCode(country) {
    return WorkerService.call({
      name: 'findCountryPhoneCode',
      params: [country],
    })
  }

  async getTimezone({ lat, long }) {
    if (!lat || !long) return undefined
    try {
      const response = await axios.get('https://timezone-by-location.p.rapidapi.com/timezone', {
        params: {
          lat: lat,
          lon: long,
          c: '1',
          s: '0',
        },
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_KEY,
          'X-RapidAPI-Host': 'timezone-by-location.p.rapidapi.com',
        },
      })
      const Zones = response?.data?.Zones
      if (!Zones || !Zones?.length) return undefined
      else return Zones[0]?.TimezoneId
    } catch (error) {
      console.error(error)
      return undefined
    }
  }

  async getLongLat(address) {
    try {
      const sPostcode = address.postcode.toUpperCase()
      const sAddresLine1 = capitalize(address.address_line_1)
      const sAddresLine2 = address?.address_line_2 ? capitalize(address.address_line_2) : null

      const response = await axios.get('https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi', {
        params: { address: `${sAddresLine1}${sAddresLine2 ? ' ' + sAddresLine2 + ' ' : ' '}${sPostcode}` },
        headers: {
          'X-RapidAPI-Key': process.env.RAPID_KEY,
          'X-RapidAPI-Host': 'address-from-to-latitude-longitude.p.rapidapi.com',
        },
      })

      const results = response?.data?.Results

      let tryJustPost = false

      if (!results?.length) tryJustPost = true

      if (results.length) {
        const firstResultsMatchingPostcode = results.find(
          (r) => r.postalcode && r.postalcode.split(' ').join('').includes(sPostcode.split(' ').join(''))
        )
        if (!firstResultsMatchingPostcode) tryJustPost = true
        else return { long: firstResultsMatchingPostcode.longitude, lat: firstResultsMatchingPostcode.latitude }
      }

      if (tryJustPost) {
        const justPostResponse = await axios.get(
          'https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi',
          {
            params: { address: sPostcode },
            headers: {
              'X-RapidAPI-Key': process.env.RAPID_KEY,
              'X-RapidAPI-Host': 'address-from-to-latitude-longitude.p.rapidapi.com',
            },
          }
        )

        const justPostResults = justPostResponse?.data?.Results

        if (!justPostResults?.length) return undefined

        const justPostResultsMatchingPostcode = justPostResults.find(
          (r) => r.postalcode && r.postalcode.split(' ').join('').includes(sPostcode.split(' ').join(''))
        )

        if (!justPostResultsMatchingPostcode) return undefined
        else return { long: justPostResultsMatchingPostcode.longitude, lat: justPostResultsMatchingPostcode.latitude }
      }

      return undefined
    } catch (error) {
      return undefined
    }
  }

  pruneLocationForNewLocationResponse(location) {
    const obj = location.toObject()
    return omit(obj, ['cuisines', 'dietary_requirements', 'restaurant', 'active_deals'])
  }

  pruneLocationsListForDeleteLocationResponse(locations, deletedID) {
    return [...locations.filter((rl) => this.getID(rl) !== deletedID)]
  }
}

const Loc = new LocationService()

export default Loc
