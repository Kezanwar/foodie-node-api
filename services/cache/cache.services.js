import cache from 'memory-cache'

export const cachePutCuisines = (cuisines) => {
  cache.put('cuisines', cuisines, 60 * 1000 * 60 * 24)
}

export const cacheGetCuisines = () => {
  return cache.get('cuisines')
}
export const cachePutDietaryRequirements = (dietaryRequirements) => {
  cache.put('dietaryRequirements', dietaryRequirements, 60 * 1000 * 60 * 24)
}

export const cacheGetDietaryRequirements = () => {
  return cache.get('dietaryRequirements')
}
