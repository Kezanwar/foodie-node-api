import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Restaurant from '../../../models/Restaurant.js'
import { RESTAURANT_REG_STEPS, RESTAURANT_ROLES, RESTAURANT_STATUS } from '../../../constants/restaurant.js'

import auth from '../../../middleware/auth.middleware.js'
import validate from '../../../middleware/validation.middleware.js'
import { companyInfoSchema, restaurantDetailsSchema } from '../../../validation/create-restaurant.validation.js'

import { createImageName, SendError, throwErr } from '../../utilities/utilities.js'
import restRoleGuard from '../../../middleware/rest-role-guard.middleware.js'
import { bucketName, foodieS3Client, s3PutCommand } from '../../../aws/s3Client.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.post('/company-info', auth, validate(companyInfoSchema), async (req, res) => {
  const { company_name, company_number, company_address } = req.body
  try {
    const user = req.user

    let uRest = user?.restaurant
    let uRestID = uRest?.id
    let uRole = uRest?.role

    console.log(uRest)

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

      if (currentRest) currentRest.company_info = company_info
      await currentRest.save()
      return res.status(200).json(currentRest.toClient())
    }
  } catch (error) {
    SendError(res, error)
  }
})

router.post(
  '/restaurant-details',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN),
  upload.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'cover_photo', maxCount: 1 },
  ]),
  validate(restaurantDetailsSchema),

  async (req, res) => {
    const {
      body: { name, bio, social_media },
      restaurant,
      files,
    } = req

    //! route is expecting formdata - any objects that arent files must be stringified and sent as formdata
    //! then destringifyd on the server

    try {
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
        ...(social_media && { social_media: JSON.parse(social_media) }),
      }

      await restaurant.updateRest(newData)

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      console.log(error)
      SendError(res, error)
    }
  }
)

export default router
