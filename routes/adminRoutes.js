const express = require('express');
const router = express.Router();
const {check} = require('express-validator');
const bcrypt = require('bcryptjs');

const isAuth = require('../utils/auth');
const channelRedirect = require('../utils/channel');
const User = require('../models/user');

const controller = require('../controllers/adminControllers');
const validators = require('../utils/validators');

router.get('/me/dashboard/:id',controller.dashboard)
router.post('/auth/login',controller.logAdmin)
router.get('/me',controller.adminAuthPage)
router.post('/auth/create',controller.createAdmin)
router.post('/suggestion',controller.suggestion)
router.get('/logout',controller.logout)
router.post('/changepassword',controller.changePassword)

module.exports = router