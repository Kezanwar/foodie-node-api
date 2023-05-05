import { format, isAfter, isPast, parseISO } from 'date-fns'
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

export const isInPastWithinTimezone = (date = '2023-05-05', tz = 'Etc/Greenwich') => {
  const todayString = new Date().toLocaleDateString([], { timeZone: tz })
  const today = new Date(format(new Date(todayString), 'yyyy-MM-dd'))
  return isAfter(today, new Date(date))
}
