import { Router } from 'express'

const router = Router()
import dotenv from 'dotenv'

import Cuisine from '#app/models/Cuisine.js'
import DietaryRequirement from '#app/models/DietaryRequirement.js'

import auth from '#app/middleware/auth.js'

import {
  cacheGetCuisines,
  cacheGetDietaryRequirements,
  cachePutCuisines,
  cachePutDietaryRequirements,
} from '#app/services/cache/index.js'

import { CUISINES_DATA, DIETARY_REQUIREMENTS } from '#app/constants/categories.js'

import { SendError } from '#app/utilities/error.js'

dotenv.config()

//* route GET api/auth/initialize
//? @desc GET A LOGGED IN USER WITH JWT
//! @access public

router.get('/', async (req, res) => {
  try {
    let resAllCuisines = cacheGetCuisines()
    let resAllDietaries = cacheGetDietaryRequirements()

    if (!resAllCuisines) {
      const allCuisines = await Cuisine.find().lean()
      resAllCuisines = allCuisines.map(({ name, slug }) => ({
        name,
        slug,
      }))
      cachePutCuisines(resAllCuisines)
    }

    if (!resAllDietaries) {
      const allDietaries = await DietaryRequirement.find().lean()
      resAllDietaries = allDietaries.map(({ name, slug }) => ({
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
    await Cuisine.deleteMany({})

    const data = CUISINES_DATA.sort(function (a, b) {
      if (a < b) {
        return -1
      }
      if (a > b) {
        return 1
      }
      return 0
    }).map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase().replace(/&/g, 'and'),
    }))

    for await (const d of data) {
      const newC = new Cuisine(d)
      await newC.save()
    }

    const allCats = await Cuisine.find({}, 'name slug')

    const recats = allCats.map(({ name, slug }) => ({
      name,
      slug,
    }))

    res.status(200).json(recats)
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/set-dietary-reqs', auth, async (req, res) => {
  try {
    await DietaryRequirement.deleteMany({})

    const data = DIETARY_REQUIREMENTS.sort(function (a, b) {
      if (a < b) {
        return -1
      }
      if (a > b) {
        return 1
      }
      return 0
    }).map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase().replace(/&/g, 'and'),
    }))

    for await (const d of data) {
      const newC = new DietaryRequirement(d)
      await newC.save()
    }

    const allCats = await DietaryRequirement.find({}, 'name slug')

    const recats = allCats.map(({ name, slug }) => ({
      name,
      slug,
    }))

    res.status(200).json(recats)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
