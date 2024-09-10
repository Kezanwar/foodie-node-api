// * custom middleware for Yup Schema validation on routes

import Logger from '../services/log/index.js'

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
    Logger.red(err)
    Logger.red(`ERROR ${500}`)
    res.status(500).json({ type: err.name, message: err.errors })
    return
  }
}

export default validate
