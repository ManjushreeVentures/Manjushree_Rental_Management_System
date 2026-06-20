export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      console.error('Validation Error Details:', JSON.stringify(result.error.flatten().fieldErrors, null, 2));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}