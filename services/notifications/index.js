import { EventEmitter } from 'node:events'
import { Expo } from 'expo-server-sdk'

import DB from '../db/index.js'
import Task from '../worker/index.js'

import { NOTIFICATION_TYPES } from '#app/constants/notifications.js'

const expo = new Expo()

class Notifications {
  static #emitter = new EventEmitter()

  static isValidPushToken(str) {
    return Expo.isExpoPushToken(str)
  }

  static async sendPushNotifications(chunkedMessages) {
    let tickets = []

    for (let chunk of chunkedMessages) {
      try {
        let ticketChunk = await expo.sendPushNotificationsAsync(chunk)
        console.log(ticketChunk)
        tickets.push(...ticketChunk)
      } catch (error) {
        console.error(error)
      }
    }

    // Later, after the Expo push notification service has delivered the notifications
    // to Apple or Google (usually quickly, but allow the the service up to 30 minutes),
    // you can check the status of each notification sent
    let receiptIds = []
    for (let ticket of tickets) {
      //TODO: Handle Ticket ERRORS
      // NOTE: If a ticket contains an error code in ticket.details.error, you
      // must handle it appropriately. The error codes are listed in the Expo
      // documentation:
      // https://docs.Expo.dev/push-notifications/sending-notifications/#individual-errors
      if (ticket.id) {
        receiptIds.push(ticket.id)
      }
    }

    let receiptIdChunks = await Task.chunkPushNotificationReceiptIds(receiptIds)
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk)
        console.log(receipts)

        // The receipts specify whether Apple or Google successfully received the
        // notification and information about an error, if one occurred.

        if (Array.isArray(receipts)) {
          for (let receipt of receipts) {
            if (receipt.status === 'ok') {
              continue
            } else if (receipt.status === 'error') {
              console.error(`There was an error sending a notification: ${receipt.message}`)
              if (receipt.details && receipt.details.error) {
                //TODO: Handle Reciept ERRORS
                // The error codes are listed in the Expo documentation:
                // https://docs.expo.dev/push-notifications/sending-notifications/#individual-errors
                // You must handle the errors appropriately.
                console.error(`The error code is ${receipt.details.error}`)
              }
            }
          }
        }
      } catch (error) {
        console.error(error)
      }
    }
  }

  //events
  static emitNewDealNotification(deal) {
    this.#emitter.emit(NOTIFICATION_TYPES.NEW_DEAL, deal)
  }

  static async handleNewDealNotification(deal) {
    const locations = await DB.getAllDealsLocationFollowersWithPushtokens(deal)
    if (!locations.length) {
      return
    }

    const messages = await Task.createNewDealNotificationMessages(locations, deal)

    await Notifications.sendPushNotifications(messages)
  }

  //start service
  static start() {
    this.#emitter.on(NOTIFICATION_TYPES.NEW_DEAL, this.handleNewDealNotification)
  }
}

export default Notifications
