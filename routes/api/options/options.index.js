import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'
dotenv.config()

// models

// middlewares
import auth from '../../../middleware/auth.middleware.js'
import { SendError } from '../../utilities/utilities.js'
import { CUISINES_DATA, DIETARY_REQUIREMENTS } from '../../../constants/categories.js'
import Cuisine from '../../../models/Cuisine.js'
import DietaryRequirement from '../../../models/DietaryRequirement.js'
import {
  cacheGetCuisines,
  cacheGetDietaryRequirements,
  cachePutCuisines,
  cachePutDietaryRequirements,
} from '../../../services/cache/cache.services.js'

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
// @access auth

router.get('/', auth, async (req, res) => {
  try {
    let resAllCuisines = cacheGetCuisines()
    let resAllDietaries = cacheGetDietaryRequirements()

    if (!resAllCuisines) {
      const allCuisines = await Cuisine.find().lean()
      resAllCuisines = allCuisines.map(({ name, slug, ...rest }) => ({
        name,
        slug,
      }))
      cachePutCuisines(resAllCuisines)
    }

    if (!resAllDietaries) {
      const allDietaries = await DietaryRequirement.find().lean()
      resAllDietaries = allDietaries.map(({ name, slug, ...rest }) => ({
        name,
        slug,
      }))
      cachePutDietaryRequirements(resAllDietaries)
    }

    res.status(200).json({ cuisines: resAllCuisines, dietary_requirements: resAllDietaries })
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/set-cuisines', auth, async (req, res) => {
  try {
    const data = CUISINES_DATA.map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase(),
    }))

    for await (const d of data) {
      const newC = new Cuisine(d)
      await newC.save()
    }

    const allCats = await Cuisine.find({}, 'name slug')

    const recats = allCats.map(({ name, slug, ...rest }) => ({
      name,
      slug,
    }))

    res.status(200).json(recats)
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/delete-cuisines', auth, async (req, res) => {
  try {
    await Cuisine.deleteMany({})

    res.status(200).json('success')
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/set-dietary-reqs', auth, async (req, res) => {
  try {
    const data = DIETARY_REQUIREMENTS.map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase(),
    }))

    for await (const d of data) {
      const newC = new DietaryRequirement(d)
      await newC.save()
    }

    const allCats = await DietaryRequirement.find({}, 'name slug')

    const recats = allCats.map(({ name, slug, ...rest }) => ({
      name,
      slug,
    }))

    res.status(200).json(recats)
  } catch (error) {
    SendError(res, error)
  }
})
router.get('/delete-dietary-reqs', auth, async (req, res) => {
  try {
    await DietaryRequirement.deleteMany({})

    res.status(200).json('success')
  } catch (error) {
    SendError(res, error)
  }
})

export default router
