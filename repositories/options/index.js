import { CUISINES_DATA, DIETARY_REQUIREMENTS } from '#app/constants/categories.js'
import Cuisine from '#app/models/cuisine.js'
import DietaryRequirement from '#app/models/dietary-requirement.js'

class OptionsRepo {
  static async setCuisineOptions() {
    await Cuisine.deleteMany({})

    const data = this.#prepareOptionsForDB(CUISINES_DATA)

    for await (const d of data) {
      const option = new Cuisine(d)
      await option.save()
    }
  }

  static async setDietaryOptions() {
    await DietaryRequirement.deleteMany({})

    const data = this.#prepareOptionsForDB(DIETARY_REQUIREMENTS)

    for (const d of data) {
      const option = new DietaryRequirement(d)
      await option.save()
    }
  }

  static #sortOptions(a, b) {
    return a > b ? 1 : -1
  }

  static #prepareOptionsForDB(options) {
    return options.sort(this.#sortOptions).map((c) => ({
      name: c,
      slug: c.split(' ').join('-').toLowerCase().replace(/&/g, 'and'),
    }))
  }

  static getCuisineOptions() {
    return Cuisine.aggregate([
      {
        $project: {
          name: 1,
          slug: 1,
        },
      },
    ])
  }
  static getDietaryOptions() {
    return DietaryRequirement.aggregate([
      {
        $project: {
          name: 1,
          slug: 1,
        },
      },
    ])
  }
}

export default OptionsRepo
