const express = require('express');
const router = express.Router();
const {check} = require('express-validator');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

const isAuth = require('../utils/auth');
const channelRedirect = require('../utils/channel');
const User = require('../models/user');

const controller = require('../controllers/anonycontrollers');
const validators = require('../utils/validators');
const limit = rateLimit({
    max:5,
    windowMs:1000 * 60 * 5,
    message: 'Too many requests pls try again in 5 mins'
})
router.get('/',controller.gethome);
router.get('/about',controller.about);
router.get('/getstarted',controller.createChannel)
//validate new user input
router.post('/createUserChannel', [
//input validators for the various input fields
check('name').isLength({min:3}).withMessage('name too short').custom((value,{req})=>{
    return validators.comfirmNewUserName(value)
}).trim(),
check('email').isEmail().custom((val,{req})=>{
    return validators.comfirmNewUserEmail(val);
}).normalizeEmail(),
check('email').custom((val,{req})=>{
    return User.findOne({email:val })
    .then((user) => {
        if(user){
            return Promise.reject('email already taken')
        }
     })
}).trim(),
check('phone').custom((val,{req})=>{
    if(val != '' && val !=null && val !== undefined){
        return User.findOne({phone:val })
        .then((user) => {
            if(user){
                return Promise.reject('phone number already taken')
            }
         })  
    }else return true
}).trim(),  
check('pwd').isLength({min:5}).withMessage('password too short').custom((val,{req})=>{
    return validators.comfirmNewUserPassword(val,req)
}).trim()
]
,
controller.createUserChannel);
//validate login credentials
router.post('/loginuser',[
    check('email').isEmail().withMessage('invalid email').trim().normalizeEmail(),
    check('pwd').isLength({min:5}).withMessage('password too short').custom((val,{req})=>{
        return validators.assertLoginCredentials(val,req)
    }),
] ,limit,controller.loginUser);

router.get('/channel',channelRedirect);
router.get('/userchannel/:id', 
isAuth,
controller.userChannel);

router.get('/sendmsg/:fid' ,controller.getPostToFeed);
router.post('/feed/:feed',check('message').trim().escape(), controller.postToFeed);
router.get('/chat/:chatId',isAuth, controller.getChatPage);
router.post('/chatme',[check('message').trim().escape(),
check('time').trim().escape(),
check('receiver').trim().escape()],isAuth,controller.sendChat);

router.get(
    '/profile/:id',
    isAuth, 
    controller.getProfilePage
    );

router.post('/updatephone',
        //validate phone number
        check('phone').isLength({min:11})
        .withMessage('invalid phone number')
        .custom((val,{req})=>{
            return User.findOne({ phone: req.body.phone  })
            .then((user) => {
                if(user){
                    return Promise.reject('phone number already taken')
                }
             })
        }).trim().escape(),   
isAuth,controller.modifyPhone);

router.post('/updateemail',
       //validate email
       check('email').isEmail()
       .withMessage('invalid email')
       .custom((val,{req})=>{
           return User.findOne({ email: req.body.email  })
           .then((user) => {
               if(user){
                   return Promise.reject('email already taken')
               }
            })
       }).trim().normalizeEmail()
,isAuth,
controller.modifyEmail);

router.post('/changepassword',
check('new').isLength({min:5}).withMessage('password too short').trim(), 
isAuth,limit,
controller.changePassword);
router.get('/confirmation',controller.confirmationPage);
router.post('/addchat',check('chatString').trim().escape(),isAuth,controller.addChat);

router.post('/retrievechat',isAuth,controller.retrieveMoreChats);
router.get('/retrievefeeds',isAuth,controller.retrieveFeed);
router.get('/loadchats',isAuth,controller.retrieveChats);
router.get('/getprofilechats',isAuth,controller.retrieveProfileChats);
router.post('/chatrequest',[check('id').trim().escape(),check('state').trim().escape()],isAuth,controller.chatRequest);
router.post('/searchuser',check('searchKey').trim().escape(),isAuth,controller.searchUser);
router.get('/retrieverequest',isAuth,controller.retrieveRequests);

router.post('/removeachat',isAuth, controller.removeAChat);
router.post('/togglemode',isAuth, controller.goAnonymous);
router.get('/deleteuseraccount/:id',isAuth,controller.deleteAccount);
router.get('/logout',isAuth, controller.logout);
router.get('/resetpassword',controller.getResetPassword);
router.post('/resetpassword',controller.reset);
router.get('/setnewpassword/:token',controller.getSetNewPassword);
router.post('/setnewpassword',[
    check('pwd').isLength({min:5})
    .withMessage('password too short').custom((val,{req})=>{
        return validators.comfirmNewUserPassword(val,req)
    }),
],limit,controller.setNewPassword);
module.exports = router;
