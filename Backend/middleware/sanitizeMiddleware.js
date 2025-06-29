import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

const sanitizeMiddleware = (req, res, next) => {
  // Remove MongoDB injection operators
  mongoSanitize()(req, res, () => {
    // Sanitize against XSS
    xss()(req, res, next);
  });
};

export default sanitizeMiddleware;