class WebhookError extends Error {
  constructor(msg, event, code) {
    super(msg)
    this.event = event
    this.code = code
    this.from_admin = true
  }
}

export default WebhookError
