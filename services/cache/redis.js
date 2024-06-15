import { createClient } from 'redis'
import dotenv from 'dotenv'
import User from '#app/models/User.js'
dotenv.config()

class Redis {
  static #client = null

  static #prefix = {
    user: 'user-',
    c_location: 'c-location-',
    c_deal: 'c-deal-',
    s_recently_viewed: 's-rec-view',
  }

  static async connect() {
    try {
      const connection = await createClient({ url: process.env.REDIS_URL }).connect()
      console.log('redis connected 🚀')
      this.#client = connection
      await this.#client.flushAll()
    } catch (error) {
      console.log('redis failed to connect... 😡')
      process.exit(1)
    }
  }

  static #getID(doc) {
    return doc._id.toHexString()
  }

  static #getUserKey(arg) {
    if (typeof arg === 'string') {
      return `${this.#prefix.user}${arg}`
    }
    return `${this.#prefix.user}${this.#getID(arg)}`
  }

  static async getUserByID(id) {
    const user = await this.#client.get(this.#getUserKey(id))
    if (user) {
      return User.hydrate(JSON.parse(user))
    } else return null
  }

  static async setUserByID(user) {
    await this.#client.set(this.#getUserKey(user), JSON.stringify(user))
  }

  static async removeUserByID(user) {
    await this.#client.del(this.#getUserKey(user))
  }
}

export default Redis
