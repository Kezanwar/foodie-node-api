import cache from 'memory-cache'

const ONE_DAY = 60 * 1000 * 60 * 24

const KEYS = {
  CUISINES: 'CUISINES',
  DIETARY: 'DIETARY',
  RECENT_BLOGS: 'RECENT_BLOGS',
}

class MemoryCache {
  //options
  setCuisineOptions(cuisines) {
    cache.put(KEYS.CUISINES, cuisines, ONE_DAY)
  }
  getCuisineOptions() {
    return cache.get(KEYS.CUISINES)
  }
  setDietaryOptions(dietary) {
    cache.put(KEYS.DIETARY, dietary, ONE_DAY)
  }
  getDietaryOptions() {
    return cache.get(KEYS.DIETARY)
  }

  //blogs
  setRecentBlogs(blogs) {
    cache.put(KEYS.RECENT_BLOGS, blogs, ONE_DAY)
  }
  getRecentBlogs() {
    return cache.get(KEYS.RECENT_BLOGS)
  }
}

const Memory = new MemoryCache()

export default Memory
