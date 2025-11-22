class HttpResponse {
  buildResponse() {
    throw new Error('buildResponse must be implemented by subclass')
  }
}

export default HttpResponse

class SuccessResp extends HttpResponse {
  constructor() {
    super()
    this.message = 'Success'
  }

  buildResponse() {
    return {
      message: this.message,
    }
  }
}

export const SuccessResponse = new SuccessResp()
