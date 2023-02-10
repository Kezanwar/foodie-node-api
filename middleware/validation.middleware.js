// * Custom middleware for Yup Schema validation on routes

// *--- EXAMPLE SCHEMA ARG ---*
//  const Example = yup.object({
//   body: yup.object({
//     url: yup.string().url().required(),
//     title: yup.string().min(8).max(32).required(),
//     content: yup.string().min(8).max(255).required(),
//     contact: yup.string().email().required(),
//   }),
//   params: yup.object({
//     id: yup.number().required(),
//   }),
//   query: yup.object({
//     page: yup.number().required(),
//   }),
// })

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
    // let errors = ''
    // err.errors.forEach(
    //   (msg: string, index: number) =>
    //     (errors = errors + (index === 0 ? '' : ', ') + msg.split('.')[1])
    // )
    res.status(500).json({ type: err.name, message: err.errors })
    return
  }
}

export default validate
