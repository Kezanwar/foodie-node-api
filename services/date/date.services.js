import { format, isPast, parseISO } from 'date-fns'
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
