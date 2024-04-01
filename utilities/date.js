import formatInTimeZone from 'date-fns-tz/formatInTimeZone'

export const expireDate = () => {
  return formatInTimeZone(new Date(), 'Etc/GMT+12', 'yyyy-MM-dd')
}
