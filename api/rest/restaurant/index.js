import { Router } from 'express'
const router = Router()
import dotenv from 'dotenv'
import multer from 'multer'
dotenv.config()
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

import Err from '#app/services/error/index.js'
import AWS from '#app/services/aws/index.js'
import IMG from '#app/services/image/index.js'
import DB from '#app/services/db/index.js'

import { authWithCache } from '#app/middleware/auth.js'
import restRoleGuard from '#app/middleware/rest-role-guard.js'
import validate from '#app/middleware/validate.js'

import { restaurantDetailsSchema } from '#app/validation/restaurant/create-restaurant.js'

import { RESTAURANT_ROLES } from '#app/constants/restaurant.js'

router.get('/', authWithCache, async (req, res) => {
  const { user } = req

  try {
    if (!user?.restaurant) return res.status(200).json({})

    const uRest = await DB.RGetRestaurantByID(user.restaurant.id)

    if (!uRest) return res.status(200).json({})

    return res.status(200).json(uRest.toClient())
  } catch (error) {
    Err.send(res, error)
  }
})

router.patch(
  '/edit',
  authWithCache,
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

    if (!cuisines || cuisines?.length <= 0) Err.throw('Must provide atleast 1 cuisine', 400)

    // route is expecting formdata - any objects that arent files must be stringified and sent as formdata
    // then destringifyd on the server

    try {
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
        ...(imageNames.avatar && { avatar: imageNames.avatar }),
        ...(imageNames.cover_photo && { cover_photo: imageNames.cover_photo }),
        name,
        bio,
        booking_link,
        ...(dietary_requirements && { dietary_requirements: JSON.parse(dietary_requirements) }),
        ...(cuisines && { cuisines: JSON.parse(cuisines) }),
        ...(social_media && { social_media: JSON.parse(social_media) }),
      }

      await DB.RUpdateAcceptedRestaurant(restaurant, newData)

      if (!restaurant.cover_photo || !restaurant.avatar) return Err.throw('Must provide an Avatar and Cover Photo')

      return res.status(200).json(restaurant.toClient())
    } catch (error) {
      Err.send(res, error)
    }
  }
)

export default router
