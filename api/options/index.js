import { Router } from 'express'

const router = Router()

import Memory from '#app/services/cache/memory.js'
import Err from '#app/services/error/index.js'
import Resp from '#app/services/response/index.js'
import OptionsRepo from '#app/repositories/options/index.js'

router.get('/', async (req, res) => {
  try {
    let cuisines = Memory.getCuisineOptions()
    let dietary = Memory.getDietaryOptions()

    if (!cuisines) {
      cuisines = await OptionsRepo.getCuisineOptions()
      Memory.setCuisineOptions(cuisines)
    }

    if (!dietary) {
      dietary = await OptionsRepo.getDietaryOptions()
      Memory.setDietaryOptions(dietary)
    }

    Resp.json(req, res, { cuisines: cuisines, dietary_requirements: dietary })
  } catch (error) {
    Err.send(req, res, error)
  }
})

export default router
