const express = require('express')

const { signin, signup, forgotPassword, resetPassword, changePassword } = require('../controllers/auth.controller')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/signup', signup)
router.post('/signin', signin)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)
router.post('/change-password', requireAuth, changePassword)

module.exports = router
