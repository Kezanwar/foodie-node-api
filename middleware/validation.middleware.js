// * custom middleware for Yup Schema validation on routes

const validate = (schema) => async (req, res, next) => {
  try {
    await schema.validate(
      {
        body: req.body,
        query: req.query,
        params: req.params,
      },
      { abortEarly: false }
    )
    next()
    return
  } catch (err) {
    console.error(err)
    res.status(500).json({ type: err.name, message: err.errors })
    return
  }
}

export default validate
