class ErrorService {
  throw(msg, code) {
    const exception = new Error(msg)
    exception.code = code ?? 500
    exception.from_admin = true
    throw exception
  }
  send(res, err) {
    console.error(err)
    res
      .status(err?.code ?? 500)
      .json({ message: err?.from_admin ? err?.message || 'Internal server error' : 'Internal server error' })
  }
  log(err) {
    console.error(err)
  }
}

const Err = new ErrorService()

export default Err
