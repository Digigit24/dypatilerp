/**
 * courseScope middleware
 *
 * Reads the `X-Course-Id` header sent by the frontend and attaches it to
 * `req.courseId`.  Every list endpoint that returns course-scoped data
 * (applicants, batches, students, tests, fees, …) checks `req.courseId`
 * first so that the UI never mixes data from two courses.
 */
export const courseScope = (req, _res, next) => {
  req.courseId = req.headers['x-course-id'] || null
  next()
}
