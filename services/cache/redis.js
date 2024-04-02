import { createClient } from 'redis'
import dotenv from 'dotenv'
import User from '#app/models/User.js'
dotenv.config()

// this fn is called in server and exports Redis Cache for use around the app
export const createRedis = async () => {
  try {
    const r = await createClient({ url: process.env.REDIS_URL }).connect()
    console.log('redis connected 🚀')
    return new RedisCache(r)
  } catch (error) {
    console.log('Error: Redis failed to connect...')
    process.exit(1)
  }
}

class RedisCache {
  #client = null

  constructor(Redis) {
    this.#client = Redis
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
