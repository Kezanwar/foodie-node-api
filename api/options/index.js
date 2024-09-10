import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'

import Memory from '#app/services/cache/memory.js'
import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'
import Resp from '#app/services/response/index.js'

dotenv.config()

router.get('/', async (req, res) => {
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

    Resp.json(req, res, { cuisines: cuisines, dietary_requirements: dietary })
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
