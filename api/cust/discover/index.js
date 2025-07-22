import { Router } from 'express'
const router = Router()

import { authWithCache } from '#app/middleware/auth.js'
import validate from '#app/middleware/validate.js'

import Err from '#app/services/error/index.js'
import Task from '#app/services/worker/index.js'
import Memory from '#app/services/cache/memory.js'
import DB from '#app/services/db/index.js'

import { discoverSchema } from '#app/validation/customer/deal.js'
import { fetchBlogs } from '#app/utilities/blogs.js'
import Resp from '#app/services/response/index.js'

router.get('/', authWithCache, validate(discoverSchema), async (req, res) => {
  const {
    query: { long, lat },
  } = req

  try {
    const LONG = Number(long)
    const LAT = Number(lat)

    let blogs = Memory.getRecentBlogs()

    const request = [DB.CGetDiscover(LONG, LAT)]

    if (!blogs) {
      request.push(fetchBlogs())
    }

    const [results, fetchedBlogs] = await Promise.all(request)

    const resp = await Task.getPopularRestaurantsAndCuisines(results)

    if (blogs) {
      resp.blogs = blogs
    } else {
      if (!fetchedBlogs) {
        resp.blogs = undefined
      } else {
        resp.blogs = fetchedBlogs
        Memory.setRecentBlogs(fetchedBlogs)
      }
    }

    return Resp.json(req, res, resp)
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
