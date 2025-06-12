import User from '../models/user.js';
import Job from '../models/job.js';

// Get all users (excluding sensitive fields)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password -verificationCode');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Get a single user by ID
export const getSingleUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -verificationCode');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Block a user
export const blockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: true },
      { new: true }
    ).select('-password -verificationCode');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.status(200).json({ msg: 'User blocked', user });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Unblock a user
export const unblockUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isBlocked: false },
      { new: true }
    ).select('-password -verificationCode');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.status(200).json({ msg: 'User unblocked', user });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.status(200).json({ msg: 'User deleted' });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// View job stats (example: total jobs, jobs per company)
export const getJobStats = async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const jobsPerCompany = await Job.aggregate([
      { $group: { _id: '$company', count: { $sum: 1 } } }
    ]);
    res.status(200).json({ totalJobs, jobsPerCompany });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};

// View system-wide stats (user count, job count)
export const getSystemStats = async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    const jobCount = await Job.countDocuments();
    res.status(200).json({ userCount, jobCount });
  } catch (error) {
    res.status(500).json({ msg: 'Server error', error: error.message });
  }
};