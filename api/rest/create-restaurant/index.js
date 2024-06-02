import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import { authNoCache, authWithCache } from '#app/middleware/auth.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'

import { isDev, isStaging } from '#app/config/config.js'

import { RESTAURANT_REG_STEPS, RESTAURANT_STATUS } from '#app/constants/restaurant.js'

import Email from '#app/services/email/index.js'
import IMG from '#app/services/image/index.js'
import AWS from '#app/services/aws/index.js'
import Err from '#app/services/error/index.js'
import Redis from '#app/services/cache/redis.js'
import DB from '#app/services/db/index.js'

import validate from '#app/middleware/validate.js'

import {
  companyInfoSchema,
  restaurantDetailsSchema,
  restaurantSubmitApplicationSchema,
} from '#app/validation/restaurant/create-restaurant.js'
import Permissions from '#app/services/permissions/index.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.post('/company-info', authNoCache, validate(companyInfoSchema), async (req, res) => {
  const { company_name, company_number, company_address } = req.body
  try {
    const user = req.user

    if (!user.email_confirmed) {
      Err.throw('Access denied - Please confirm your email before accessing these resources', 403)
    }

    let uRest = user?.restaurant
    let uRestID = uRest?.id
    let uRole = uRest?.role

    const company_info = {
      company_name,
      company_number,
      company_address,
    }

    if (!uRestID) {
      // user has no restaurant yet, first time hitting this step
      const created = await DB.RCreateNewRestaurant(company_info, user)

      await Redis.setUserByID(created.user)

      return res.status(200).json(created.restaurant.toClient())
    } else {
      // user has a restaurant
      if (!uRole) {
        Err.throw('Unable to find Restaurant or User Permissions')
      }

      if (!Permissions.hasEditPermission(uRole)) {
        Err.throw('Access denied - user permissions', 400)
      }

      const currentRest = await DB.RGetRestaurantByID(uRestID)

      if (!currentRest) {
        Err.throw('Restaurant doesnt exist', 400)
      }

      if (Permissions.isApplicationProcessing(currentRest.status)) {
        Err.throw(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      await DB.RUpdateApplicationRestaurant(currentRest, { company_info })

      return res.status(200).json(currentRest.toClient())
    }
  } catch (error) {
    Err.send(res, error)
  }
})

//* route POST api/create-restaurant/details (STEP 2)
//? @desc STEP 2 creates new or updates restaurants details, name, bio, images, cuisines, dietary requirements, social media
//! @access private && super_admin

router.post(
  '/details',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { applicationOnly: true }),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover_photo', maxCount: 1 },
  ]),
  validate(restaurantDetailsSchema),

  async (req, res) => {
    const {
      body: { name, bio, social_media, dietary_requirements, cuisines, booking_link },
      restaurant,
      files,
    } = req

    if (!cuisines || cuisines?.length <= 0) {
      Err.throw('Must provide atleast 1 cuisine', 400)
    }

    // route is expecting formdata - any objects that arent files must be stringified and sent as formdata
    // then destringifyd on the server

    try {
      if (Permissions.isApplicationProcessing(restaurant.status)) {
        Err.throw(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (!restaurant.registration_step) {
        Err.throw('Error: Must complete step 1 first')
      }

      const rAvatar = restaurant?.avatar
      const rCoverPhoto = restaurant?.cover_photo

      const uAvatar = files?.avatar?.[0]
      const uCoverPhoto = files?.cover_photo?.[0]

      if ((!rAvatar && !uAvatar) || (!rCoverPhoto && !uCoverPhoto)) {
        Err.throw('Error - Restaurant must provide Avatar and Cover Photo', 400)
        return
      }

      if (uAvatar && !IMG.isAcceptedFileType(uAvatar.mimetype)) {
        Err.throw('Restaurant avatar must be JPEG or PNG', 400)
      }

      if (uCoverPhoto && !IMG.isAcceptedFileType(uCoverPhoto.mimetype)) {
        Err.throw('Restaurant cover photo must be JPEG or PNG', 400)
      }

      const imageNames = {}
      const saveImagePromises = []

      if (uAvatar) {
        imageNames.avatar = IMG.createImageName(restaurant.image_uuid, 'avatar')
        const buffer = await IMG.resizeAvatar(uAvatar.buffer)
        saveImagePromises.push(AWS.saveImage(imageNames.avatar, buffer))
      }
      if (uCoverPhoto) {
        imageNames.cover_photo = IMG.createImageName(restaurant.image_uuid, 'cover_photo')
        const buffer = await IMG.resizeCoverPhoto(uCoverPhoto.buffer)
        saveImagePromises.push(AWS.saveImage(imageNames.cover_photo, buffer))
      }

      await Promise.all(saveImagePromises)

      const newData = {
        ...(imageNames.avatar && {
          avatar: IMG.appendLastUpdated(imageNames.avatar),
        }),
        ...(imageNames.cover_photo && { cover_photo: IMG.appendLastUpdated(imageNames.cover_photo) }),
        name,
        bio,
        booking_link,
        ...(dietary_requirements && { dietary_requirements: JSON.parse(dietary_requirements) }),
        ...(cuisines && { cuisines: JSON.parse(cuisines) }),
        ...(social_media && { social_media: JSON.parse(social_media) }),
      }

      if (restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_1_COMPLETE) {
        newData.registration_step = RESTAURANT_REG_STEPS.STEP_2_COMPLETE
      }

      await DB.RUpdateApplicationRestaurant(restaurant, newData)

      if (!restaurant.cover_photo || !restaurant.avatar) {
        Err.throw('Must provide an Avatar and Cover Photo')
      }

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      Err.send(res, error)
    }
  }
)

//* route POST api/create-restaurant/locations (STEP 3)
//? @desc STEP 3, checks if the restaurant has a minimum of 1 locations added
//! @access private && super_admin

router.post(
  '/locations',
  authWithCache,
  restRoleGuard(Permissions.EDIT, { applicationOnly: true }),
  async (req, res) => {
    const { restaurant } = req

    try {
      if (Permissions.isApplicationProcessing(restaurant.status)) {
        Err.throw(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (!restaurant?.registration_step || restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_1_COMPLETE) {
        Err.throw('Error: Must complete step 1 & 2 first')
        return
      }

      const locations = await DB.RGetRestaurantLocations(restaurant._id)

      if (!locations || locations.length === 0) {
        Err.throw('Error: A minimum of 1 locations is required')
        return
      }

      if (restaurant.registration_step === RESTAURANT_REG_STEPS.STEP_2_COMPLETE) {
        await DB.RUpdateApplicationRestaurant(restaurant, { registration_step: RESTAURANT_REG_STEPS.STEP_3_COMPLETE })
      }

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      Err.send(res, error)
    }
  }
)

//* route POST api/create-restaurant/submit-application (STEP 4)
//? @desc STEP 4, checks if the restaurant has all details and submits application
//! @access private && super_admin

router.post(
  '/submit-application',
  authWithCache,
  validate(restaurantSubmitApplicationSchema),
  restRoleGuard(Permissions.EDIT, { applicationOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      body: { terms_and_conditions, privacy_policy },
    } = req

    try {
      if (Permissions.isApplicationProcessing(restaurant.status)) {
        Err.throw(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (restaurant.registration_step !== RESTAURANT_REG_STEPS.STEP_3_COMPLETE) {
        Err.throw('Error: Must complete step 1 & 2 & 3 first')
        return
      }

      const locations = await DB.RGetRestaurantLocations(restaurant._id)

      if (!locations || locations.length === 0) {
        Err.throw('Error: A minimum of 1 locations is required')
        return
      }

      const newData = {
        terms_and_conditions,
        privacy_policy,
        registration_step: RESTAURANT_REG_STEPS.STEP_4_COMPLETE,
        status: RESTAURANT_STATUS.APPLICATION_PROCESSING,
      }

      await Promise.all([
        DB.RUpdateApplicationRestaurant(restaurant, newData),
        Email.sendAdminReviewApplicationEmail({ restaurant, locations }),
      ])

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      Err.send(res, error)
    }
  }
)

if (isDev || isStaging) {
  router.get('/accept-application/:id', async (req, res) => {
    const {
      params: { id },
    } = req

    try {
      const restaurant = await DB.RGetRestaurantByIDWithSuperAdmin(id)

      if (!restaurant) {
        Err.throw('No restaurant found', 401)
      }

      const user = await DB.getUserByID(restaurant.super_admin)

      if (!user) {
        Err.throw('No user found', 401)
      }

      await DB.RUpdateApplicationRestaurant(restaurant, { status: RESTAURANT_STATUS.APPLICATION_ACCEPTED })

      await Email.sendSuccessfulApplicationEmail(user, restaurant)

      res.json(`Restaurant: ${restaurant.name} status is ${restaurant.status}, success email sent to ${user.email}!`)
    } catch (error) {
      Err.send(res, error)
    }
  })
}

if (isDev || isStaging) {
  router.get('/decline-application/:id', async (req, res) => {
    const {
      params: { id },
    } = req

    try {
      const restaurant = await DB.RGetRestaurantByIDWithSuperAdmin(id)

      if (!restaurant) {
        Err.throw('No restaurant found', 401)
      }

      const user = await DB.getUserByID(restaurant.super_admin)

      if (!user) {
        Err.throw('No user found', 401)
      }

      await DB.RUpdateApplicationRestaurant(restaurant, { status: RESTAURANT_STATUS.APPLICATION_REJECTED })

      await Email.sendRejectedApplicationEmail(user, restaurant)

      res.json(`Restaurant: ${restaurant.name} status is ${restaurant.status}, success email sent to ${user.email}!`)
    } catch (error) {
      Err.send(res, error)
    }
  })
}

export default router
