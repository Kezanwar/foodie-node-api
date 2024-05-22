import Notifications from '../../notifications/index.js'

const checkoutFeedNotificationHandler = () => {
  Notifications.emitCheckoutFeedNotification()
}

export default checkoutFeedNotificationHandler
