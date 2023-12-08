export const throwErr = (msg, code) => {
  const exception = new Error(msg)
  exception.code = code ?? 500
  exception.from_admin = true
  throw exception
}

export function SendError(res, err) {
  console.error(err)
  res
    .status(err.code ?? 500)
    .json({ message: err?.from_admin ? err?.message || 'Internal server error' : 'Internal server error' })
}
