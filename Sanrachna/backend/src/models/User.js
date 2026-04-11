const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ['owner', 'engineer', 'worker'],
      default: 'engineer',
    },
    phone: { type: String, default: '' },
    departmentCrew: { type: String, default: '' },
    employeeId: { type: String, default: '' },
    companyName: { type: String, default: '' },
    businessAddress: { type: String, default: '' },
    specialization: { type: String, default: '' },
    assignedProjects: { type: String, default: '' },
    crewType: { type: String, default: '' },
    supervisorName: { type: String, default: '' },
  },
  { timestamps: true },
)

module.exports = mongoose.model('User', userSchema)
