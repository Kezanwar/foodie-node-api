import cache from 'memory-cache'

const ONE_DAY = 60 * 1000 * 60 * 24

export const cachePutCuisines = (cuisines) => {
  cache.put('cuisines', cuisines, ONE_DAY)
}

export const cacheGetCuisines = () => {
  return cache.get('cuisines')
}
export const cachePutDietaryRequirements = (dietaryRequirements) => {
  cache.put('dietaryRequirements', dietaryRequirements, ONE_DAY)
}

export const cacheGetDietaryRequirements = () => {
  return cache.get('dietaryRequirements')
}

export const cachePutRecentBlogs = (blogs) => {
  cache.put('blogs', blogs, ONE_DAY)
}

export const cacheGetRecentBlogs = () => {
  return cache.get('blogs')
}
