import { EventEmitter } from 'node:events'

import Task from '../worker/index.js'
import DB from '../db/index.js'

const EVENTS = {
  SYNC_APP_USER_STATS: 'SYNC_APP_USER_STATS',
}

class Stats {
  static #emitter = new EventEmitter()

  static emitSyncAppUserStatsEvent(data, user) {
    this.#emitter.emit(EVENTS.SYNC_APP_USER_STATS, data, user)
  }

  static async handleSyncAppUserStatsEvent(data, user) {
    try {
      const stats = await Task.parseAppUserStatsForSyncing(data, user)
      await DB.RBulkAddAppUserStats(stats)
    } catch (error) {
      console.log(error)
    }
  }

  //start service
  static start() {
    this.#emitter.on(EVENTS.SYNC_APP_USER_STATS, this.handleSyncAppUserStatsEvent)
  }
}

export default Stats
