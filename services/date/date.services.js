import { endOfYesterday, format, isAfter, isPast, parseISO } from 'date-fns'
import { throwErr } from '../../routes/utilities/utilities.js'
import { timezonesData } from '../../constants/timezones.js'
import formatInTimeZone from 'date-fns-tz/formatInTimeZone'
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

export const yeserdayDateString = () => {
  return format(endOfYesterday(), 'yyyy-MM-dd')
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

export const checkTimezoneCurrentTime = (tz = 'europe/london') => {
  if (!tz) throwErr('check timezones current time needs a timezone', 500)
  try {
    const time = new Date().toLocaleString('en-GB', { timeZone: tz })
    return time.split(' ')[1].split(':')
  } catch (error) {
    console.error(error)
    return undefined
  }
}

export const getGMTandDSTDateStrings = () => {
  return {
    // gmt: formatInTimeZone(new Date(), 'Europe/London', 'yyyy-MM-dd'),
    dst: formatInTimeZone(new Date(), 'Etc/GMT+12', 'yyyy-MM-dd'),
  }
}

export const expireDate = () => {
  const { dst } = getGMTandDSTDateStrings()
  return dst
}

export const timeNowInGMT = () => {
  return new Date().toUTCString().split(' ')[4].split(':')
}

export const getTimezonesToExpire = () => {
  const midnightStart = 0
  const midnightEnd = 24
  const [hour] = timeNowInGMT()
  const nowHour = Number(hour)

  const minusGMTArray = timezonesData
    .filter((tz) => {
      const strOffset = tz.offset.toString()
      const isMinus = tz.offset <= 0
      const numToMinus = tz.offset === 0 ? tz.offset : Number(strOffset.charAt(1))
      return isMinus && nowHour - numToMinus === midnightStart
    })
    .map((el) => {
      return el.utc
    })
    .flat(1)
    .filter((tz) => {
      const [hour] = checkTimezoneCurrentTime(tz)
      return Number(hour) === midnightStart
    })

  const plusGMTArray = timezonesData
    .filter((tz) => {
      const isPlus = tz.offset >= 0
      return isPlus && nowHour + tz.offset === midnightEnd
    })
    .map((el) => {
      return el.utc
    })
    .flat(1)
    .filter((tz) => {
      const [hour] = checkTimezoneCurrentTime(tz)
      return Number(hour) === midnightStart
    })

  return { minusGMT: minusGMTArray, plusGMT: plusGMTArray }
}
