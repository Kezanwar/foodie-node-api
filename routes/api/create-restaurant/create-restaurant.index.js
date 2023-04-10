import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '../../../constants/restaurant.js'

import transporter, { getEmailOptions } from '../../../emails/emails.nodemailer.js'
import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import {
  companyInfoSchema,
  restaurantDetailsSchema,
  restaurantSubmitApplicationSchema,
} from '../../../validation/create-restaurant.validation.js'

import { createImageName, SendError, throwErr } from '../../utilities/utilities.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { bucketName, foodieS3Client, s3PutCommand } from '../../../aws/s3Client.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauant || restaurant

router.post('/company-info', auth, validate(companyInfoSchema), async (req, res) => {
  const { company_name, company_number, company_address } = req.body
  try {
    const user = req.user

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
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover_photo', maxCount: 1 },
  ]),
  validate(restaurantDetailsSchema),

  async (req, res) => {
    const {
      body: { name, bio, social_media, dietary_requirements, cuisines },
      restaurant,
      files,
    } = req

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
              // if (item === STORE_IMAGES.profile_image) {
              //   buffer = await resizeProfilePhoto(buffer)
              // }
              const pc = s3PutCommand({
                Bucket: bucketName,
                Key: createImageName(restaurant, item, img),
                Body: buffer,
                ContentType: img.mimetype,
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
        ...(dietary_requirements && { dietary_requirements: JSON.parse(dietary_requirements) }),
        ...(cuisines && { cuisines: JSON.parse(cuisines) }),
        ...(social_media && { social_media: JSON.parse(social_media) }),
      }

      await restaurant.updateRest(newData)

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

router.post('/locations', auth, restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN), async (req, res) => {
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

    if (!restaurant?.locations || restaurant?.locations.length === 0) {
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
})

//* route POST api/create-restaurant/submit-application (STEP 4)
//? @desc STEP 4, checks if the restaurant has all details and submits application
//! @access private && super_admin

router.post(
  '/submit-application',
  auth,
  validate(restaurantSubmitApplicationSchema),
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
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

      if (!restaurant.locations || restaurant.locations.length === 0) {
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

      const emailOptions = getEmailOptions(
        ['kezanwar@gmail.com', 'shak@thefoodie.app'],
        `New restaurant application: ${restaurant.name}`,
        'action-email',
        {
          user_name: 'Admin',
          title: `New restaurant application: ${restaurant.name}`,
          description: `New restaurant application 
          </br> 
          - Company name: ${restaurant.company_info.company_name}
          </br> 
          - Bio: ${restaurant.bio}
          </br> 
          - Cuisines: ${cuisinesText}
          </br> 
          - Dietary requirements: ${dietText}
          `,
          action_text: 'No action',
          action_href: '...',
        }
      )
      transporter.sendMail(emailOptions, (err, info) => {
        if (err) console.log(err)
        else console.log('email sent' + ' ' + info.response)
      })

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  }
)

export default router