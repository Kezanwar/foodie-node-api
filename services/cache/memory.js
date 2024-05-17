import cache from 'memory-cache'

const ONE_DAY = 60 * 1000 * 60 * 24

const KEYS = {
  CUISINES: 'CUISINES',
  DIETARY: 'DIETARY',
  RECENT_BLOGS: 'RECENT_BLOGS',
}

class Memory {
  //options
  static setCuisineOptions(cuisines) {
    cache.put(KEYS.CUISINES, cuisines, ONE_DAY)
  }
  static getCuisineOptions() {
    return cache.get(KEYS.CUISINES)
  }
  static setDietaryOptions(dietary) {
    cache.put(KEYS.DIETARY, dietary, ONE_DAY)
  }
  static getDietaryOptions() {
    return cache.get(KEYS.DIETARY)
  }

  //blogs
  static setRecentBlogs(blogs) {
    cache.put(KEYS.RECENT_BLOGS, blogs, ONE_DAY)
  }
  static getRecentBlogs() {
    return cache.get(KEYS.RECENT_BLOGS)
  }
}

export default Memory
