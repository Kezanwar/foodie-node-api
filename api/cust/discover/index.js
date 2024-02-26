import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()

import Location from '#app/models/Location.js'

import auth from '#app/middleware/auth.js'

import { SendError, throwErr } from '#app/utilities/error.js'
import { workerService } from '#app/services/worker/index.js'
import { cacheGetRecentBlogs, cachePutRecentBlogs } from '#app/services/cache/index.js'
import axios from 'axios'
import { landingUrl } from '#app/config/config.js'

const fetchBlogs = async () => {
  return axios.get(`${landingUrl}/api/recent`).then((res) =>
    res.data.edges.map((d) => ({
      ...d.node,
      featuredImage: d.node.featuredImage.node.sourceUrl,
      author: d.node.author.node,
    }))
  )
}

const METER_TO_MILE_CONVERSION = 0.00062137

const RADIUS_METRES = 20000 //20km

const getQueryLocations = () => {
  const defaults = { active_deals: { $ne: [], $exists: true } }

  return defaults
}

router.get('/', auth, async (req, res) => {
  const {
    query: { long, lat },
    // coords must be [long, lat]
  } = req

  //https://stackoverflow.com/questions/18883601/function-to-calculate-distance-between-two-coordinates

  try {
    if (!long || !lat) throwErr('No coordinates', 400)

    const LONG = Number(long)
    const LAT = Number(lat)

    for (let n of [LONG, LAT]) {
      if (isNaN(n)) throwErr('You must pass a number for Long or Lat')
    }

    const query = getQueryLocations()

    let blogs = cacheGetRecentBlogs()

    const request = [
      Location.aggregate([
        {
          $geoNear: {
            near: { type: 'Point', coordinates: [LONG, LAT] },
            distanceField: 'distance_miles',
            spherical: true,
            maxDistance: RADIUS_METRES,
            distanceMultiplier: METER_TO_MILE_CONVERSION,
            query: query,
          },
        },
        {
          $lookup: {
            from: 'restaurants', // Replace with the name of your linked collection
            localField: 'restaurant.id',
            foreignField: '_id',
            let: { locationId: '$_id' },
            pipeline: [
              {
                $project: {
                  followMatch: {
                    $filter: {
                      input: '$followers',
                      as: 'foll',
                      cond: {
                        $eq: ['$$foll.location_id', '$$locationId'],
                      },
                    },
                  },
                },
              },
            ],
            as: 'rest',
          },
        },
        {
          $addFields: {
            followCount: { $size: { $arrayElemAt: ['$rest.followMatch', 0] } },
          },
        },
        {
          $sort: {
            followCount: -1,
          },
        },
        {
          $project: {
            restaurant: {
              id: '$restaurant.id',
              name: '$restaurant.name',
              avatar: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.avatar'] },
              cover_photo: { $concat: [process.env.S3_BUCKET_BASE_URL, '$restaurant.cover_photo'] },
              followers: '$followCount',
              cuisines: '$cuisines',
              dietary: '$dietary_requirements',
            },
            location: {
              id: '$_id',
              nickname: '$nickname',
              distance_miles: '$distance_miles',
            },
          },
        },
      ]),
    ]

    if (!blogs) {
      request[1] = fetchBlogs()
    }

    const [results, fetchedBlogs] = await Promise.all(request)

    const resp = await workerService.call({
      name: 'getPopularRestaurantsAndCuisines',
      params: [JSON.stringify(results)],
    })

    if (blogs) {
      resp.blogs = blogs
    } else {
      resp.blogs = fetchedBlogs
      cachePutRecentBlogs(fetchedBlogs)
    }

    return res.json(resp)
  } catch (error) {
    SendError(res, error)
  }
})

export default router
