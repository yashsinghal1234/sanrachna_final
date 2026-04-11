const express = require('express')

const { requireAuth } = require('../middleware/auth')
const { asyncHandler } = require('../utils/asyncHandler')
const { searchUsers } = require('../controllers/users.controller')

const router = express.Router()

router.use(requireAuth)

router.get('/search', asyncHandler(searchUsers))

module.exports = router
