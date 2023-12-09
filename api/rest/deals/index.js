import { Router } from 'express'
import mongoose from 'mongoose'
const router = Router()
import dotenv from 'dotenv'
dotenv.config()
import { isBefore } from 'date-fns'

// models
import Deal from '../../../models/Deal.js'
import Location from '../../../models/Location.js'

// constants
import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'
import { DEALS_PER_LOCATION } from '../../../constants/deals.js'

// middlewares
import auth from '../../../middleware/auth.js'
import restRoleGuard from '../../../middleware/rest-role-guard.js'
import validate from '../../../middleware/validation.js'

// validations
import { addDealSchema, editDealSchema } from '../../../validation/deals.js'

// utils
import { SendError, throwErr } from '../../../utilities/error.js'
import { getID } from '../../../utilities/document.js'
import { capitalizeSentence } from '../../../utilities/strings.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.get('/active', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    query: { current_date },
  } = req
  try {
    let currentDate = current_date ? new Date(current_date) : new Date()

    const query = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
          $or: [{ is_expired: false }, { end_date: { $gt: currentDate } }],
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views'] },
            },
          },
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
          id: '$_id',
          days_left: {
            $cond: {
              if: { $lt: ['$start_date', currentDate] },
              then: {
                $dateDiff: {
                  startDate: currentDate,
                  endDate: '$end_date',
                  unit: 'day',
                },
              },
              else: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: '$end_date',
                  unit: 'day',
                },
              },
            },
          },
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', currentDate] },
              then: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: currentDate,
                  unit: 'day',
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $unset: ['locations', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt', 'description'],
      },
    ]).sort({ updatedAt: -1 })

    res.json(query)
  } catch (error) {
    SendError(res, error)
  }
})

router.get('/expired', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }), async (req, res) => {
  const {
    restaurant,
    query: { current_date },
  } = req
  try {
    let currentDate = current_date ? new Date(current_date) : new Date()
    const agg = await Deal.aggregate([
      {
        $match: {
          'restaurant.id': restaurant._id,
          $or: [{ is_expired: true }, { end_date: { $lte: currentDate } }],
        },
      },
      {
        $addFields: {
          unique_views: {
            $sum: {
              $size: { $setUnion: [[], '$views'] },
            },
          },
          views: { $size: '$views' },
          favourites: { $size: '$favourites' },
          id: '$_id',
          days_active: {
            $cond: {
              if: { $lt: ['$start_date', currentDate] },
              then: {
                $dateDiff: {
                  startDate: '$start_date',
                  endDate: '$end_date',
                  unit: 'day',
                },
              },
              else: 0,
            },
          },
        },
      },
      {
        $unset: ['locations', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt', 'description'],
      },
    ]).sort({ updatedAt: -1 })

    res.json(agg)
  } catch (error) {
    SendError(res, error)
  }
})

router.get(
  '/single/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      params: { id },
      restaurant,
      query: { current_date },
    } = req

    let currentDate = current_date ? new Date(current_date) : new Date()

    try {
      const deal = await Deal.aggregate([
        {
          $match: {
            'restaurant.id': restaurant._id,
            _id: mongoose.Types.ObjectId(id),
          },
        },
        {
          $addFields: {
            days_active: {
              $dateDiff: {
                startDate: '$start_date',
                endDate: currentDate,
                unit: 'day',
              },
            },
          },
        },
        {
          $addFields: {
            counts: {
              unique_views: {
                $sum: {
                  $size: { $setUnion: [[], '$views'] },
                },
              },
              views: { $size: '$views' },
              favourites: { $size: '$favourites' },
            },
          },
        },
        {
          $addFields: {
            averages: {
              unique_views: {
                $cond: {
                  if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.unique_views', 1] }] },
                  then: {
                    $divide: ['$counts.unique_views', '$days_active'],
                  },
                  else: '$counts.unique_views',
                },
              },
              views: {
                $cond: {
                  if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.views', 1] }] },
                  then: {
                    $divide: ['$counts.views', '$days_active'],
                  },
                  else: '$counts.views',
                },
              },
              favourites: {
                $cond: {
                  if: { $and: [{ $gte: ['$days_active', 1] }, { $gte: ['$counts.favourites', 1] }] },
                  then: {
                    $divide: ['$counts.favourites', '$days_active'],
                  },
                  else: '$counts.favourites',
                },
              },
            },
          },
        },
        {
          $unset: ['views', 'favourites', 'restaurant', 'cuisines', 'dietary_requirements', 'createdAt'],
        },
      ])

      if (!deal?.length) {
        throwErr('Deal not found', 402)
        return
      } else res.json(deal[0])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.get(
  '/use-template/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      params: { id },
      restaurant,
    } = req

    try {
      const deal = await Deal.aggregate([
        {
          $match: {
            'restaurant.id': restaurant._id,
            _id: mongoose.Types.ObjectId(id),
          },
        },
        {
          $unset: [
            'views',
            'favourites',
            'restaurant',
            'cuisines',
            'dietary_requirements',
            'createdAt',
            'updatedAt',
            'is_expired',
            'start_date',
            'end_date',
            'locations',
          ],
        },
      ])

      if (!deal?.length) {
        throwErr('Deal not found', 402)
        return
      } else res.json(deal[0])
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.post(
  '/add',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true, getLocations: true }),
  validate(addDealSchema),
  async (req, res) => {
    const {
      restaurant,
      locations: restLocations,
      body: { start_date, end_date, name, description, locations },
      query: { current_date },
    } = req

    let currentDate = current_date ? new Date(current_date) : new Date()

    try {
      const activeDealsCount = await Deal({
        'restaurant.id': restaurant._id,
        $or: [{ is_expired: false }, { end_date: { $gt: currentDate } }],
      })

      const locationsCount = restLocations.length || 0

      if (activeDealsCount >= locationsCount * DEALS_PER_LOCATION) {
        throwErr('Maxmimum active deals limit reached', 402)
      }

      const locationsMap = locations
        .map((id) => {
          const mappedLoc = restLocations.find((rL) => getID(rL) === id)
          return mappedLoc ? { location_id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
        })
        .filter(Boolean)

      if (!locationsMap?.length) throwErr('Error: No matching locations found', 400)

      const deal = new Deal({
        start_date,
        end_date,
        name: capitalizeSentence(name),
        description,
        locations: locationsMap,
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          avatar: restaurant.avatar,
          cover_photo: restaurant.cover_photo,
        },
        dietary_requirements: restaurant.dietary_requirements,
        cuisines: restaurant.cuisines,
        is_expired: false,
      })

      const updateLocationsActiveDealProm = Location.updateMany(
        {
          'restaurant.id': restaurant._id,
          _id: { $in: locations },
        },
        { $push: { active_deals: deal._id } }
      )

      await Promise.all([deal.save(), updateLocationsActiveDealProm])
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/edit/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true, getLocations: true }),
  validate(editDealSchema),
  async (req, res) => {
    const {
      restaurant,
      locations: restLocations,
      params: { id },
      body: { name, description, end_date, locations },
    } = req

    const locationsMap = locations
      .map((id) => {
        const mappedLoc = restLocations.find((rL) => getID(rL) === id)
        return mappedLoc ? { location_id: id, geometry: mappedLoc.geometry, nickname: mappedLoc.nickname } : false
      })
      .filter(Boolean)

    if (!locationsMap?.length) throwErr('Error: No matching locations found', 400)

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to edit this deal', 400)
      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        throwErr('Deal end date cannot be before the start date', 400)
      }

      const proms = []

      const locationsToRemove = deal.locations.reduce((acc, oldL) => {
        if (!locations.find((newL) => oldL.location_id.toHexString() === newL)) {
          acc.push(oldL.location_id)
        }
        return acc
      }, [])

      if (locationsToRemove?.length) {
        proms.push(
          Location.updateMany(
            {
              'restaurant.id': restaurant._id,
              _id: { $in: locationsToRemove },
            },
            { $pull: { active_deals: deal._id } }
          )
        )
      }

      const locationsToAdd = locations.reduce((acc, newL) => {
        if (!deal.locations.find((oldL) => oldL.location_id.toHexString() === newL)) {
          acc.push(newL)
        }
        return acc
      }, [])

      if (locationsToAdd?.length) {
        proms.push(
          Location.updateMany(
            {
              'restaurant.id': restaurant._id,
              _id: { $in: locationsToAdd },
            },
            { $push: { active_deals: deal._id } }
          )
        )
      }

      deal.name = name
      deal.description = description
      deal.end_date = end_date
      deal.locations = locationsMap

      proms.push(deal.save())

      await Promise.all(proms)
      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)
router.post(
  '/delete/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
    } = req

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to delete this deal', 400)

      await Promise.all([
        Location.updateMany(
          {
            'restaurant.id': restaurant._id,
          },
          { $pull: { active_deals: deal._id } }
        ),
        deal.delete(),
      ])

      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

router.patch(
  '/expire/:id',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      params: { id },
      body: { end_date },
    } = req

    try {
      const deal = await Deal.findById(id)
      if (!deal) throwErr('Deal not found', 400)
      if (getID(deal.restaurant) !== getID(restaurant)) throwErr('Unauthorized to expire this deal', 400)
      if (deal.is_expired) throwErr('Deal is already expired', 400)
      if (isBefore(new Date(), new Date(deal.start_date))) {
        throwErr('You cant expire a deal that hasnt started yet', 400)
      }
      if (!end_date) throwErr('Must provide an end_date', 400)
      if (isBefore(new Date(end_date), new Date(deal.start_date))) {
        throwErr('You cant expire a deal that hasnt start yet... Deal end date cannot be before the start date', 400)
      }
      deal.is_expired = true
      deal.end_date = end_date

      await Promise.all([
        Location.updateMany(
          {
            'restaurant.id': restaurant._id,
          },
          { $pull: { active_deals: deal._id } }
        ),
        deal.save(),
      ])

      return res.status(200).json('Success')
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router
