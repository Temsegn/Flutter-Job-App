import jwt from 'jsonwebtoken';

const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role, // Include role instead of isAdmin
    },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

export default generateToken;
