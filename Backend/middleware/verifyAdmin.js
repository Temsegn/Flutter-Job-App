const verifyAdmin = (req, res, next) => {
    console.log('Decoded User:', req.user); // 🔍 debug

  if (!req.user) {
    return res.status(401).json({ msg: 'User not authenticated' });
  }

  // Check for role or admin flag
  if ( req.user.role === 'admin') {
    return next();
  }

  return res.status(403).json({ msg: 'Access denied: Admins only' });
};

export default verifyAdmin;
