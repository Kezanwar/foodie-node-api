import { EventEmitter } from 'node:events'
// import { Expo } from 'expo-server-sdk'

class Notifications {
  static #emitter = new EventEmitter()

  static #EVENTS = {
    NEW_DEAL: 'NEW_DEAL',
    CHECKOUT_FEED: 'CHECKOUT_FEED',
  }

  static sendPushNotification() {}

  //events
  static emitNewDealNotification(deal) {
    this.#emitter.emit(this.#EVENTS.NEW_DEAL, deal)
  }

  static handleNewDealNotification(deal) {
    console.log(deal)
  }

  static emitNewCheckoutFeedNotification(deal) {
    this.#emitter.emit(this.#EVENTS.NEW_DEAL, deal)
  }

  static handleNewCheckoutFeedNotification() {}

  //start service
  static start() {
    this.#emitter.on(this.#EVENTS.NEW_DEAL, this.handleNewDealNotification)
    this.#emitter.on(this.#EVENTS.CHECKOUT_FEED, this.handleNewDealNotification)
  }
}

export default Notifications
