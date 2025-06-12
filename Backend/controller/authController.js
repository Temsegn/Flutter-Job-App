import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import generateToken from '../utils/generateToken.js';
import generateCode from '../utils/generateCode.js';
import { sendVerificationEmail,sendWelcomeEmail } from '../mailtrap/sendEmail.js'; // Assuming you have a mailtrap config file

const JWT_SECRET = process.env.JWT_SECRET || 'abegiya';

// Register new user
export const registerUser = async (req, res) => {
  const { username, email, password, location } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateCode(6); // Generate a 6-digit verification code
    const user = new User({
      username,
      email,
      password: hashedPassword,
      location,
      verificationCode,
      testPass:password,
      token: null, // Initialize token to null
    });
    
    // Send verification email
    await sendVerificationEmail(verificationCode); // Assuming this function sends the email
    
   const savedUser= await user.save();
   const token = generateToken(savedUser);

 //welcome email

   res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000
}); 

res.status(201).json({
  msg: "User registered successfully",
  user: {
    _id: savedUser._id,
    username: savedUser.username,
    email: savedUser.email,
    isAdmin: savedUser.isAdmin,
    isAgent: savedUser.isAgent,
    isVerified: savedUser.isVerified,
    token: token, // Include the token in the response
  }
});


//     res.status(201).json({
//    user: {
//     _id: savedUser._id,
//     username: savedUser.username,
//     email: savedUser.email,
//     isAdmin: savedUser.isAdmin,
//     isAgent: savedUser.isAgent,
//     verificationCode: savedUser.verificationCode, // You may want to omit this too
//     isVerified: savedUser.isVerified
//   },
// });

  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Login user
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    if (!user.isVerified)
     return res.status(403).json({ msg: 'Please verify your email before logging in' });


    const token = generateToken(user);

    // res.json({  token,
    //   user: {
    //     _id: user._id,
    //     username: user.username,
    //     email: user.email,
    //     isAdmin: user.isAdmin,
    //     isAgent: user.isAgent,
    //   }, });
res.cookie("token", token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
});
 

res.status(201).json({
  msg: "User registered successfully",
  user: {
    _id: user._id,
    username: user.username,
    email: user.email,
    isAdmin: user.isAdmin,
    isAgent: user.isAgent,
    isVerified: user.isVerified
  }
});


  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get current user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'User not found' });

  if (user.isVerified) return res.status(400).json({ msg: 'User already verified' });

  if (user.verificationCode !== code)
    return res.status(400).json({ msg: 'Invalid verification code' });

  user.isVerified = true;
  user.verificationCode = null;
  await user.save();

  res.status(200).json({ msg: 'Email verified successfully' });
};
export const resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ msg: 'User not found' });
    if (user.isVerified) return res.status(400).json({ msg: 'User already verified' });
    const newCode = generateCode(6);
    user.verificationCode = newCode;
    await user.save();
  // Here you would send the new verification code to the user's email
    res.status(200).json({ msg: 'Verification code resent', code: newCode });
}


export const forgotPassword = async (req, res) => {
	const { email } = req.body;
	try {
		const user = await User.findOne({ email });

		if (!user) {
			return res.status(400).json({ success: false, message: "User not found" });
		}

		// Generate reset token
		const resetToken = crypto.randomBytes(20).toString("hex");
		const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

		user.resetPasswordToken = resetToken;
		user.resetPasswordExpiresAt = resetTokenExpiresAt;

		await user.save();

		// send email
		await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);

		res.status(200).json({ success: true, message: "Password reset link sent to your email" });
	} catch (error) {
		console.log("Error in forgotPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const { token } = req.params;
		const { password } = req.body;

		const user = await User.findOne({
			resetPasswordToken: token,
			resetPasswordExpiresAt: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ success: false, message: "Invalid or expired reset token" });
		}

		// update password
		const hashedPassword = await bcryptjs.hash(password, 10);

		user.password = hashedPassword;
		user.resetPasswordToken = undefined;
		user.resetPasswordExpiresAt = undefined;
		await user.save();

		await sendResetSuccessEmail(user.email);

		res.status(200).json({ success: true, message: "Password reset successful" });
	} catch (error) {
		console.log("Error in resetPassword ", error);
		res.status(400).json({ success: false, message: error.message });
	}
};


