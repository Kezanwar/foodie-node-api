import { Expo } from 'expo-server-sdk'
import { NOTICATION_NATIVE_APP_TYPES } from '#app/services/notifications/types.js'

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
      for (const token of follower.push_tokens) {
        messages.push({
          to: token,
          sound: 'default',
          title: `Foodie`,
          body: `${location.restaurant_name} ${location.location_name} has posted a new deal: ${d.name} - Check it out!`,
          data: { type: NOTICATION_NATIVE_APP_TYPES.SINGLE_DEAL, location_id: location._id, deal_id: d._id },
        })
      }
    }
  }

  return expo.chunkPushNotifications(messages)
}
