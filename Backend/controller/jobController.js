import Job from '../models/job.js';

// Create a new job
export async function createJob(req, res) {
  const { title, description, company, location, period, contractType, requirements, imageUrl, salary } = req.body;
  if (!title || !description || !company || !location || !period || !contractType || !requirements || !salary) {
    return res.status(400).json({ msg: 'Please provide all required fields' });
  }
  console.log('Creating job with data:', req.user, req.body);
  const job = await Job.create({
    ...req.body,
    postedBy: req.user.userId || req.user._id,
  });
  res.status(201).json({ job });
}


// Get all jobs for the authenticated user
export async function getAllJobs(req, res) {
  const jobs = await Job.find().sort('-createdAt');
  res.status(200).json({ jobs, count: jobs.length });
}

// Get a single job by ID
export async function getJob(req, res) {
  const job = await Job.findOne({ _id: req.params.id  });
  if (!job) return res.status(404).json({ msg: 'Job not found' });
  res.status(200).json({ job });
}

// Update a job by ID
export async function updateJob(req, res) {
  const job = await Job.findOneAndUpdate(
    { _id: req.params.id},
    req.body,
    { new: true, runValidators: true }
  );
  if (!job) return res.status(404).json({ msg: 'Job not found' });
  res.status(200).json({ job });
}

// Delete a job by ID
export async function deleteJob(req, res) {
  const job = await Job.findOneAndDelete({ _id: req.params.id, postedBy: req.user.id || req.user._id });
  if (!job) return res.status(404).json({ msg: 'Job not found' });
  res.status(200).json({ msg: 'Job deleted' });
}

// Show stats (placeholder)
export async function showStats(req, res) {
  res.status(200).json({ defaultStats: {}, monthlyApplications: [] });
}
