import { Expo } from 'expo-server-sdk'
import { NOTIFICATION_TYPES } from '#app/constants/notifications.js'

export const expo = new Expo()

export const chunkPushNotificationReceiptIds = (receiptIds) => {
  const r = JSON.parse(receiptIds)
  return expo.chunkPushNotificationReceiptIds(r)
}

export const createNewDealNotificationMessages = (locations, deal) => {
  // locations = [{ restaurant_name, location_name, followers }]
  const d = JSON.parse(deal)
  const l = JSON.parse(locations).filter((has) => !!has.followers.length)
  const messages = []
  for (const location of l) {
    for (const follower of location.followers) {
      for (const token of follower.pushTokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: `${location.restaurant_name} ${location.location_name}`,
          body: `Has posted a new deal, ${d.name}.`,
          data: { type: NOTIFICATION_TYPES.NEW_DEAL, location_id: location._id, deal_id: d._id },
        })
      }
    }
  }

  return expo.chunkPushNotifications(messages)
}
