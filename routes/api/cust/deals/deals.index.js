import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'

import { SendError, throwErr } from '../../../utilities/utilities.js'
import Deal from '../../../../models/Deal.js'

dotenv.config()

const LIMIT = 20 //20 results at a time
const RADIUS_DEFAULT = 3000 //3km

router.get('/feed', async (req, res) => {
  const {
    query: { page, long, lat, radius },
    // coords must be [long, lat]
  } = req

  try {
    if (!long || !lat) throwErr('No coordinates', 400)

    const PAGE = page ? page * LIMIT : 0

    const results = await Deal.find({
      is_expired: false,
      'locations.geometry.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [long, lat],
          },
          $maxDistance: radius || RADIUS_DEFAULT,
          $minDistance: 0,
        },
      },
    })
      .limit(LIMIT)
      .skip(PAGE)

    return res.json({ count: results.length, results })
  } catch (error) {
    SendError(res, error)
  }
})

export default router
