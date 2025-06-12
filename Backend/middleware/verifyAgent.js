const verifyAgent = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ msg: 'User not authenticated' });
  }
  if (req.user.role === 'agent') {
    return next();
  }
  return res.status(403).json({ msg: 'Access denied: Agents only' });
};

export default verifyAgent;
