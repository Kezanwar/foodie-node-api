import { Router } from 'express'
import { renderFile } from 'ejs'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Restaurant from '../../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '../../../../constants/restaurant.js'

import auth from '../../../../middleware/auth.middleware.js'
import validate from '../../../../middleware/validation.middleware.js'
import {
  companyInfoSchema,
  restaurantDetailsSchema,
  restaurantSubmitApplicationSchema,
} from '../../../../validation/create-restaurant.validation.js'

import { findRestaurantsLocations, getID, SendError, throwErr } from '../../../utilities/utilities.js'
import restRoleGuard from '../../../../middleware/rest-role-guard.middleware.js'

import { bucketName, foodieS3Client, s3PutCommand } from '../../../../services/aws/aws.services.js'
import transporter from '../../../../services/email/email.services.js'
import { generalWorkerService } from '../../../../services/workers/general.service.worker.js'

import { email_addresses } from '../../../../constants/email.js'
import { ACCEPTED_FILES, RESTAURANT_IMAGES } from '../../../../constants/images.js'
import { appEnv } from '../../../../base/base.js'
import { createImageName, createImgUUID } from '../../../../services/images/images.services.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.post('/company-info', auth, validate(companyInfoSchema), async (req, res) => {
  const { company_name, company_number, company_address } = req.body
  try {
    const user = req.user

    if (!user.email_confirmed)
      throwErr('Access denied - Please confirm your email before accessing these resources', 403)

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
      const newRest = new Restaurant({
        company_info,
        super_admin: user.id,
        registration_step: RESTAURANT_REG_STEPS.STEP_1_COMPLETE,
        status: RESTAURANT_STATUS.APPLICATION_PENDING,
        image_uuid: createImgUUID(),
      })
      await newRest.save()

      user.restaurant = { id: newRest.id, role: RESTAURANT_ROLES.SUPER_ADMIN }
      await user.save()

      return res.status(200).json(newRest.toClient())
    } else {
      // user has a restaurant
      if (!uRole) {
        throwErr('Unable to find Restaurant or User Permissions')
      }
      if (uRole !== RESTAURANT_ROLES.SUPER_ADMIN) throwErr('Access denied - user permissions', 400)

      const currentRest = await Restaurant.findById(uRestID)

      if (!currentRest) throwErr('Restaurant doesnt exist', 400)

      if (currentRest.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        throwErr(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (currentRest) currentRest.company_info = company_info
      await currentRest.save()
      return res.status(200).json(currentRest.toClient())
    }
  } catch (error) {
    SendError(res, error)
  }
})

//* route POST api/create-restaurant/details (STEP 2)
//? @desc STEP 2 creates new or updates restaurants details, name, bio, images, cuisines, dietary requirements, social media
//! @access private && super_admin

router.post(
  '/details',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { applicationOnly: true }),
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

    if (!cuisines || cuisines?.length <= 0) throwErr('Must provide atleast 1 cuisine', 400)

    //! route is expecting formdata - any objects that arent files must be stringified and sent as formdata
    //! then destringifyd on the server

    try {
      if (restaurant.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        throwErr(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (!restaurant.registration_step) {
        throwErr('Error: Must complete step 1 first')
        return
      }

      const rAvatar = restaurant?.avatar
      const rCoverPhoto = restaurant?.cover_photo

      const uAvatar = files?.avatar
      const uCoverPhoto = files?.cover_photo

      if ((!rAvatar && !uAvatar) || (!rCoverPhoto && !uCoverPhoto)) {
        throwErr('Error - Restaurant must provide Avatar and Cover Photo', 400)
        return
      }

      if (uAvatar && !!ACCEPTED_FILES.some((type) => type === uAvatar.mimetype)) {
        throwErr('Restaurant avatar must be JPEG or PNG', 400)
        return
      }

      if (uCoverPhoto && !!ACCEPTED_FILES.some((type) => type === uCoverPhoto.mimetype)) {
        throwErr('Restaurant cover photo must be JPEG or PNG', 400)
        return
      }

      const filesArr = Object.entries(files)

      // update existing store

      let imageNames = {}

      const promises = filesArr.map(
        (entry) =>
          // eslint-disable-next-line no-async-promise-executor
          new Promise(async (resolve, reject) => {
            try {
              const item = entry[0]
              const img = entry[1][0]
              const imageName = createImageName(restaurant, item, img)
              imageNames[item] = imageName
              let buffer = img.buffer
              if (item === RESTAURANT_IMAGES.avatar) {
                buffer = await generalWorkerService.call({
                  name: 'resizeImg',
                  params: [buffer, { width: 500 }],
                })
              }
              if (item === RESTAURANT_IMAGES.cover_photo) {
                buffer = await generalWorkerService.call({
                  name: 'resizeImg',
                  params: [buffer, { width: 1000 }],
                })
              }
              const pc = s3PutCommand({
                Bucket: bucketName,
                Key: createImageName(restaurant, item, img),
                Body: buffer,
                ContentType: 'image/jpeg',
              })
              const res = await foodieS3Client.send(pc)
              resolve(res)
            } catch (error) {
              reject(error)
            }
          })
      )

      await Promise.all(promises)

      const newData = {
        ...(imageNames.avatar && { avatar: imageNames.avatar }),
        ...(imageNames.cover_photo && { cover_photo: imageNames.cover_photo }),
        name,
        bio,
        booking_link,
        ...(dietary_requirements && { dietary_requirements: JSON.parse(dietary_requirements) }),
        ...(cuisines && { cuisines: JSON.parse(cuisines) }),
        ...(social_media && { social_media: JSON.parse(social_media) }),
      }

      await restaurant.updateRest(newData)

      if (!restaurant.cover_photo || !restaurant.avatar) return throwErr('Must provide an Avatar and Cover Photo')

      if (restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_1_COMPLETE) {
        restaurant.registration_step = RESTAURANT_REG_STEPS.STEP_2_COMPLETE
        await restaurant.save()
      }

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  }
)

//* route POST api/create-restaurant/locations (STEP 3)
//? @desc STEP 3, checks if the restaurant has a minimum of 1 locations added
//! @access private && super_admin

router.post(
  '/locations',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { applicationOnly: true }),
  async (req, res) => {
    const { restaurant } = req

    try {
      if (restaurant?.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        throwErr(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (!restaurant?.registration_step || restaurant?.registration_step === RESTAURANT_REG_STEPS.STEP_1_COMPLETE) {
        throwErr('Error: Must complete step 1 & 2 first')
        return
      }

      const locations = await findRestaurantsLocations(restaurant._id)

      if (!locations || locations.length === 0) {
        throwErr('Error: A minimum of 1 locations is required')
        return
      }

      if (restaurant.registration_step === RESTAURANT_REG_STEPS.STEP_2_COMPLETE) {
        restaurant.registration_step = RESTAURANT_REG_STEPS.STEP_3_COMPLETE
        await restaurant.save()
      }

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  }
)

//* route POST api/create-restaurant/submit-application (STEP 4)
//? @desc STEP 4, checks if the restaurant has all details and submits application
//! @access private && super_admin

router.post(
  '/submit-application',
  auth,
  validate(restaurantSubmitApplicationSchema),
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { applicationOnly: true }),
  async (req, res) => {
    const {
      restaurant,
      body: { terms_and_conditions, privacy_policy },
    } = req

    try {
      if (restaurant.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        throwErr(
          'Error: We are processing your application, please wait for an update via email before editing and resubmitting',
          400
        )
      }

      if (restaurant.registration_step !== RESTAURANT_REG_STEPS.STEP_3_COMPLETE) {
        throwErr('Error: Must complete step 1 & 2 & 3 first')
        return
      }

      const locations = await findRestaurantsLocations(restaurant._id)

      if (!locations || locations.length === 0) {
        throwErr('Error: A minimum of 1 locations is required')
        return
      }

      restaurant.terms_and_conditions = terms_and_conditions
      restaurant.privacy_policy = privacy_policy

      restaurant.registration_step = RESTAURANT_REG_STEPS.STEP_4_COMPLETE
      restaurant.status = RESTAURANT_STATUS.APPLICATION_PROCESSING

      await restaurant.save()

      const cuisinesText = restaurant.cuisines.map((c) => c.name).join(', ')
      const dietText = restaurant.dietary_requirements.map((c) => c.name).join(', ')

      const locationsText = locations.map((c) => `${c.address.address_line_1}, ${c.address.postcode}`).join(' - ')

      renderFile(
        process.cwd() + '/views/emails/action-email.ejs',
        {
          content: 'Review the application and accept / decline using the actions below.',
          title: `New restaurant application: ${restaurant.name}`,
          list: [
            `Bio: ${restaurant.bio}`,
            `Cuisines: ${cuisinesText}`,
            `Dietary requirements: ${dietText}`,
            `Company name: ${restaurant.company_info.company_name}`,
            `Locations: ${locationsText}`,
          ],
          action_primary: {
            text: 'Accept',
            url: `${process.env.BASE_URL}/rest/create-restaurant/accept-application/${getID(restaurant)}`,
          },
          action_secondary: {
            text: 'Decline',
            url: `${process.env.BASE_URL}/rest/create-restaurant/decline-application/${getID(restaurant)}`,
          },
          receiver: 'Admin',
        },
        function (err, data) {
          if (err) {
            console.log(err)
          } else {
            const mainOptions = {
              from: email_addresses.noreply,
              to: ['kezanwar@gmail.com', 'shak@thefoodie.app'],
              subject: `New restaurant application: ${restaurant.name}`,
              html: data,
            }
            transporter.sendMail(mainOptions, function (err, info) {
              if (err) {
                console.log(err)
              } else {
                console.log('email sent: ' + info.response)
              }
            })
          }
        }
      )

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  }
)

if (appEnv === 'development' || appEnv === 'staging') {
  router.get('/accept-application/:id', async (req, res) => {
    const {
      params: { id },
    } = req

    try {
      if (!id) return throwErr('No ID', 401)
      const restaurant = await Restaurant.findById(id)
      if (!restaurant) return throwErr('No restaurant', 401)
      if (restaurant.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        restaurant.status = RESTAURANT_STATUS.APPLICATION_ACCEPTED
        await restaurant.save()
      }
      return res.json(`Restaurant: ${restaurant.name} status is ${restaurant.status}`)
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  })
}

if (appEnv === 'development' || appEnv === 'staging') {
  router.get('/decline-application/:id', async (req, res) => {
    const {
      params: { id },
    } = req

    try {
      if (!id) return throwErr('No ID', 401)
      const restaurant = await Restaurant.findById(id)
      if (!restaurant) return throwErr('No restaurant', 401)
      if (restaurant.status === RESTAURANT_STATUS.APPLICATION_PROCESSING) {
        restaurant.status = RESTAURANT_STATUS.APPLICATION_REJECTED
        await restaurant.save()
      }
      return res.json(`Restaurant: ${restaurant.name} status is ${restaurant.status}`)
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  })
}

export default router
