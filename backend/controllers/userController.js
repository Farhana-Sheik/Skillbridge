const User = require('../models/User');

const getUsers = async (req, res) => {
  const { role } = req.query;
  const filter = role ? { role } : {};
  const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
  res.json(users);
};

const getUserById = async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.json(user);
};

const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { name, email, role, phone, isActive } = req.body;

  if (name) user.name = name;
  if (email) user.email = email;
  if (role) user.role = role;
  if (phone !== undefined) user.phone = phone;
  if (isActive !== undefined) user.isActive = isActive;

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    phone: updated.phone,
    isActive: updated.isActive,
  });
};

const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user._id.toString() === req.user._id.toString()) {
    return res.status(400).json({ message: 'Cannot delete your own account' });
  }

  const Enrollment = require('../models/Enrollment');
  const Submission = require('../models/Submission');
  const Course = require('../models/Course');
  const Assignment = require('../models/Assignment');
  const Job = require('../models/Job');
  const JobApplication = require('../models/JobApplication');

  if (user.role === 'student') {
    await Enrollment.deleteMany({ student: user._id });
    await Submission.deleteMany({ student: user._id });
    await JobApplication.deleteMany({ student: user._id });
  } else if (user.role === 'trainer') {
    const courses = await Course.find({ trainer: user._id });
    const courseIds = courses.map((c) => c._id);
    const assignments = await Assignment.find({ course: { $in: courseIds } });
    const assignmentIds = assignments.map((a) => a._id);

    await Submission.deleteMany({ assignment: { $in: assignmentIds } });
    await Assignment.deleteMany({ course: { $in: courseIds } });
    await Enrollment.deleteMany({ course: { $in: courseIds } });
    await Course.deleteMany({ trainer: user._id });
  } else if (user.role === 'admin') {
    const jobs = await Job.find({ postedBy: user._id });
    const jobIds = jobs.map((j) => j._id);
    await JobApplication.deleteMany({ job: { $in: jobIds } });
    await Job.deleteMany({ postedBy: user._id });
  }

  await user.deleteOne();
  res.json({ message: 'User removed' });
};

module.exports = { getUsers, getUserById, updateUser, deleteUser };
