class HttpResponse {
  buildResponse() {
    throw new Error('buildResponse must be implemented by subclass')
  }
}

export default HttpResponse
