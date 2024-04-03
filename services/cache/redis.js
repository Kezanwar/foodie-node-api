import { createClient } from 'redis'
import dotenv from 'dotenv'
import User from '#app/models/User.js'
dotenv.config()

class RedisCache {
  #client = null

  async connect() {
    try {
      const connection = await createClient({ url: process.env.REDIS_URL }).connect()
      console.log('redis connected 🚀')
      this.#client = connection
    } catch (error) {
      console.log('Error: Redis failed to connect...')
      process.exit(1)
    }
  }

  #getID(doc) {
    return doc._id.toHexString()
  }

  async getUserByID(id) {
    const user = await this.#client.get(id)
    if (user) {
      return User.hydrate(JSON.parse(user))
    } else return null
  }

  async setUserByID(user) {
    await this.#client.set(this.#getID(user), JSON.stringify(user))
  }

  async removeUserByID(user) {
    await this.#client.del(this.#getID(user))
  }
}

const Redis = new RedisCache()

export default Redis
