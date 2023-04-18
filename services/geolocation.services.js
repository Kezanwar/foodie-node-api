import dotenv from 'dotenv'
dotenv.config()
import _ from 'lodash'
const { capitalize } = _
import { throwErr } from '../routes/utilities/utilities'
import axios from 'axios'

export const getLongLat = async (address) => {
  try {
    if (!address.postcode || !address.address_line_1)
      throwErr('Need postcode and address line 1 to get geographical data', 500)

    const sPostcode = address.postcode.toUpperCase()
    console.log(sPostcode)
    const sAddresLine1 = capitalize(address.address_line_1)

    const response = await axios.get('https://address-from-to-latitude-longitude.p.rapidapi.com/geolocationapi', {
      params: { address: `${sAddresLine1} ${sPostcode}` },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_KEY,
        'X-RapidAPI-Host': 'address-from-to-latitude-longitude.p.rapidapi.com',
      },
    })

    const results = response?.data?.Results

    let tryJustPost = false

    if (!results?.length) tryJustPost = true

    if (results.length) {
      console.log(results)
      const firstResultsMatchingPostcode = results.find(
        (r) => r.postalcode && r.postalcode.split(' ').join('') === sPostcode.split(' ').join('')
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

      console.log(justPostResults)

      const justPostResultsMatchingPostcode = justPostResults.find(
        (r) => r.postalcode && r.postalcode.split(' ').join('') === sPostcode.split(' ').join('')
      )

      if (!justPostResultsMatchingPostcode) return undefined
      else return { long: justPostResultsMatchingPostcode.longitude, lat: justPostResultsMatchingPostcode.latitude }
    }

    return undefined
  } catch (error) {
    throwErr(error, 500)
  }
}
