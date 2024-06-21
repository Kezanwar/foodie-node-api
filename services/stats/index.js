import { EventEmitter } from 'node:events'
import { STAT_EVENTS } from './types.js'

import Task from '../worker/index.js'
import DB from '../db/index.js'

class Stats {
  static #emitter = new EventEmitter()

  static emitCacheNewRecentlyViewed(recently_viewed, user) {
    this.#emitter.emit(STAT_EVENTS.CACHE_NEW_RECENTLY_VIEWED, recently_viewed, user)
  }

  static async handleCacheNewRecentlyViewed(recently_viewed, user) {
    const stats = await Task.parseRecentlyViewedStatsIntoDealViews(recently_viewed, user)
    await DB.RBulkAddDealViewStats(stats)
  }

  //start service
  static start() {
    this.#emitter.on(STAT_EVENTS.CACHE_NEW_RECENTLY_VIEWED, this.handleCacheNewRecentlyViewed)
  }
}

export default Stats
