import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Restaurant from '../../../models/Restaurant.js'

import auth from '../../../middleware/auth.js'

import restRoleGuard from '../../../middleware/rest-role-guard.js'
import { RESTAURANT_ROLES } from '../../../constants/restaurant.js'
import validate from '../../../middleware/validation.js'
import { restaurantDetailsSchema } from '../../../validation/create-restaurant.js'
import { ACCEPTED_FILES, RESTAURANT_IMAGES } from '../../../constants/images.js'
import { createImageName } from '../../../utilities/images.js'
import { workerService } from '../../../services/worker/worker.js'
import { bucketName, foodieS3Client, s3PutCommand } from '../../../services/aws/aws.js'
import Deal from '../../../models/Deal.js'
import { SendError, throwErr } from '../../../utilities/error.js'

//* route POST api/create-restaurant/company-info (STEP 1)
//? @desc STEP 1 either create a new restaurant and set the company info, reg step, super admin and status, or update existing stores company info and leave rest unchanged
//! @access authenticated & no restauaant || restaurant

router.get('/', auth, async (req, res) => {
  const { user } = req

  try {
    if (!user?.restaurant) return res.status(200).json({})

    const uRest = await Restaurant.findById(user?.restaurant?.id)

    if (!uRest) return res.status(200).json({})

    // await fakeLongLoadPromise()
    return res.status(200).json(uRest.toClient())
  } catch (error) {
    SendError(res, error)
  }
})

router.patch(
  '/edit',
  auth,
  restRoleGuard(RESTAURANT_ROLES.SUPER_ADMIN, { acceptedOnly: true }),
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

      // update existing restaurant

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
                buffer = await workerService.call({
                  name: 'resizeImg',
                  params: [buffer, { width: 500 }],
                })
              }
              if (item === RESTAURANT_IMAGES.cover_photo) {
                buffer = await workerService.call({
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

      const updateRestProm = restaurant.updateRest(newData)

      const updateDealsProm = Deal.updateMany(
        {
          'restaurant.id': restaurant._id,
        },
        {
          $set: {
            'restaurant.name': name,
          },
        }
      )

      await Promise.all([updateRestProm, updateDealsProm])

      if (!restaurant.cover_photo || !restaurant.avatar) return throwErr('Must provide an Avatar and Cover Photo')

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      SendError(res, error)
    }
  }
)

export default router
