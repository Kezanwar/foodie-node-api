import { format, isAfter, isPast, parseISO } from 'date-fns'
import { throwErr } from '../../routes/utilities/utilities.js'
import axios from 'axios'
import { timezonesData } from '../../constants/timezones.js'
// A date string format is yyyy-mm-dd

export const todayDateString = () => {
  return format(new Date(), 'yyyy-MM-dd')
}

export const isoToDateNumbers = (iso) => {
  return format(parseISO(iso), 'dd-MM-yyyy')
}

export const isoToDateText = (iso) => {
  return format(parseISO(iso), 'EE-do-MMM-yyyy').split('-').join(' ')
}

export const isDatePast = (iso) => {
  return isPast(parseISO(iso))
}

export const isInPastWithinTimezone = (date, timezone) => {
  // date needs to be in yyyy-MM-dd
  const todayString = new Date().toLocaleDateString([], { timeZone: timezone })
  const today = new Date(format(new Date(todayString), 'yyyy-MM-dd'))
  try {
    const result = isAfter(today, new Date(date))
    return result
  } catch (error) {
    console.error(error)
  }
}

export const checkTimezoneCurrentTime = async (tz = 'europe/london') => {
  if (!tz) throwErr('check timezones current time needs a timezone', 500)
  try {
    const response = await axios.get('https://world-time-by-api-ninjas.p.rapidapi.com/v1/worldtime', {
      params: {
        timezone: tz,
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_KEY,
        'X-RapidAPI-Host': 'world-time-by-api-ninjas.p.rapidapi.com',
      },
    })
    return response?.data
  } catch (error) {
    console.error(error)
    return undefined
  }
}

export const timeNowInGMT = () => {
  return new Date().toUTCString().split(' ')[4]
}

export const getTimezonesToExpire = async () => {
  const midnightStart = 0
  const midnightEnd = 24
  const nowHour = Number(timeNowInGMT().split(':')[0])

  let plusGMTValidated = []
  let minusGMTValidated = []

  const minusGMTArray = timezonesData
    .filter((tz) => {
      const strOffset = tz.offset.toString()
      if (strOffset.includes('-')) {
        if (nowHour - Number(strOffset.charAt(1)) === midnightStart) return tz
      }
    })
    .map((el) => {
      return el.utc
    })
    .flat(1)
  const plusGMTArray = timezonesData
    .filter((tz) => {
      const strOffset = tz.offset.toString()
      if (!strOffset.includes('-')) {
        if (nowHour + tz.offset === midnightEnd) return tz
      }
    })
    .map((el) => {
      return el.utc
    })
    .flat(1)

  if (plusGMTArray.length > 0) {
    const plusProms = plusGMTArray.map((pTz) => {
      return checkTimezoneCurrentTime(pTz)
    })

    const plusPromiseResults = await Promise.all(plusProms)

    plusGMTValidated = plusPromiseResults.reduce((arr, current) => {
      if (Number(current.hour) === midnightStart) arr.push(current.timezone)
      return arr
    }, [])
  }

  if (minusGMTArray.length > 0) {
    const minusProms = minusGMTArray.map((pTz) => {
      return checkTimezoneCurrentTime(pTz)
    })

    const minusPromsResults = await Promise.all(minusProms)

    minusGMTValidated = minusPromsResults.reduce((arr, current) => {
      if (Number(current.hour) === midnightStart) arr.push(current.timezone)
      return arr
    }, [])
  }

  return { minusGMT: minusGMTValidated, plusGMT: plusGMTValidated }
}
