const express = require('express')

const { signin, signup, forgotPassword, resetPassword } = require('../controllers/auth.controller')

const router = express.Router()


router.post('/signup', signup)
router.post('/signin', signin)
router.post('/forgot-password', forgotPassword)
router.post('/reset-password', resetPassword)

module.exports = router
