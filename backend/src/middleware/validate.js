import { badRequest } from '../utils/response.js';

/**
 * Validate req.body against a Zod schema.
 * Usage: validate(myZodSchema)
 */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return badRequest(
      res,
      'Validation failed',
      result.error.errors.map((e) => ({ path: e.path.join('.'), message: e.message }))
    );
  }
  req[source] = result.data;
  next();
};
