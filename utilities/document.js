import _ from 'lodash'

export function getDocumentValues(arrayOfRequiredKeys, document) {
  if (!arrayOfRequiredKeys || !Array.isArray(arrayOfRequiredKeys || !document))
    throw new Error(
      'getDocumentValues expects an array of values as its first argument and the MGDB/Document to pull from as the second'
    )

  const object = document.toObject()

  return _.pick(object, arrayOfRequiredKeys)
}

export function removeDocumentValues(arrayOfUnrequiredKeys, document) {
  if (!arrayOfUnrequiredKeys || !Array.isArray(arrayOfUnrequiredKeys || !document))
    throw new Error(
      'removeDocumentValues expects an array of values as its first argument and the MGDB/Document to omit from as the second'
    )
  const object = document.toObject()
  return _.omit(object, arrayOfUnrequiredKeys)
}

export function removeObjectValues(arrayOfUnrequiredKeys, object) {
  return _.omit(object, arrayOfUnrequiredKeys)
}

export const getID = (doc) => {
  return doc?._id?.toHexString ? doc?._id?.toHexString() : doc?.id?.toHexString() || doc?.id
}
