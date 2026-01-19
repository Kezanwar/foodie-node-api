import pkg from 'lodash'
import axios from 'axios'
const { upperCase, capitalize } = pkg
import { RAPID_API_KEY } from '#app/config/config.js'

export function getDistanceInMiles(coord1, coord2) {
  const [lon1, lat1] = coord1
  const [lon2, lat2] = coord2
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1) // deg2rad below
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const d = R * c // Distance in km
  return d * 0.621371 // Converted to Miles
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}

class LocationUtil {
  static getID(doc) {
    if (doc._id) return doc._id.toHexString()
    if (doc.id) return doc?.id?.toHexString ? doc?.id?.toHexString() : doc.id
  }

  static getDistanceInMiles(geo1, geo2) {
    return getDistanceInMiles(geo1, geo2)
  }

  static shortPostocde(postcode) {
    return upperCase(postcode).split(' ').join('')
  }

  static async getTimezone({ lat, long }) {
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
          'X-RapidAPI-Key': RAPID_API_KEY,
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

  static async getLongLat(address) {
    try {
      const sPostcode = address.postcode.toUpperCase()
      const sAddresLine1 = capitalize(address.address_line_1)
      const sAddresLine2 = address?.address_line_2 ? capitalize(address.address_line_2) : null

      const response = await axios.get('https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi', {
        params: { address: `${sAddresLine1}${sAddresLine2 ? ' ' + sAddresLine2 + ' ' : ' '}${sPostcode}` },
        headers: {
          'X-RapidAPI-Key': RAPID_API_KEY,
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
              'X-RapidAPI-Key': RAPID_API_KEY,
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
}

export default LocationUtil
