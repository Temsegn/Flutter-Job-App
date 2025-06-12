const verifyAndAuthorization = (req, res, next) => {
  try {
    // Check if user is authorized (user or admin)
    if (req.user.id === req.params.id || req.user.isAdmin) {
      next(); // user is authorized
    } else {
      return res.status(403).json({ msg: "Access denied: Unauthorized" });
    }
  } catch (error) {
    return res.status(500).json({ msg: "Server error", error: error.message });
  }
};
 


export default verifyAndAuthorization;