import asyncHandler from 'express-async-handler';

const roleMiddleware = (allowedRoles) => asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user.role) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  if (!allowedRoles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Access denied: ${allowedRoles.join(' or ')} role required`);
  }

  next();
});

export default roleMiddleware;