import axios from 'axios'
import dotenv from 'dotenv'
dotenv.config()
import _ from 'lodash'
const { capitalize } = _

import { countries } from '#app/constants/countries.js'

import Location from '#app/models/Location.js'

import Err from '#app/services/error/index.js'

export const getLongLat = async (address) => {
  try {
    if (!address.postcode || !address.address_line_1)
      Err.throw('Need postcode and address line 1 to get geographical data', 500)

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
    Err.throw(error, 500)
  }
}

export const getTimezone = async ({ lat, long }) => {
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

export function findCountryPhoneCode(country) {
  const code = countries.find((c) => c.label === country)?.phone
  return `+${code}`
}

export async function findRestaurantsLocations(
  rest_id,
  select = '-cuisines -dietary_requirements -restaurant -active_deals'
) {
  if (!rest_id) Err.throw('No Restaurant / Locations found')
  if (!select) {
    const locationsNoSelect = await Location.find({ 'restaurant.id': rest_id })
    return locationsNoSelect
  }
  const locations = await Location.find({ 'restaurant.id': rest_id }).select(select)
  return locations
}
