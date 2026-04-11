const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../utils/asyncHandler')
const { getProfile, updateProfile, updatePassword } = require('../controllers/settings/profile.controller')
const { searchUsers } = require('../controllers/users.controller')

const router = express.Router()
router.use(requireAuth)

router.get('/me', asyncHandler(getProfile))
router.patch('/me', asyncHandler(updateProfile))
router.patch('/me/password', asyncHandler(updatePassword))
router.get('/search', asyncHandler(searchUsers))

module.exports = router
