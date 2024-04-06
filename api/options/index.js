import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'

import Memory from '#app/services/cache/memory.js'
import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

dotenv.config()

router.get('/', async (_, res) => {
  try {
    let cuisines = Memory.getCuisineOptions()
    let dietary = Memory.getDietaryOptions()

    if (!cuisines) {
      cuisines = await DB.getCuisines()
      Memory.setCuisineOptions(cuisines)
    }

    if (!dietary) {
      dietary = await DB.getDietaryRequirements()
      Memory.setDietaryOptions(dietary)
    }

    res.status(200).json({ cuisines: cuisines, dietary_requirements: dietary })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
