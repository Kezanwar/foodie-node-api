import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'

import Memory from '#app/services/cache/memory.js'
import Err from '#app/services/error/index.js'
import DB from '#app/services/db/index.js'

dotenv.config()

router.get('/', async (_, res) => {
  try {
    let resAllCuisines = Memory.getCuisineOptions()
    let resAllDietaries = Memory.getDietaryOptions()

    if (!resAllCuisines) {
      resAllCuisines = await DB.getCuisines()
      Memory.setCuisineOptions(resAllCuisines)
    }

    if (!resAllDietaries) {
      resAllDietaries = await DB.getDietaryRequirements()
      Memory.setDietaryOptions(resAllDietaries)
    }

    res.status(200).json({ cuisines: resAllCuisines, dietary_requirements: resAllDietaries })
  } catch (error) {
    Err.send(res, error)
  }
})

export default router
