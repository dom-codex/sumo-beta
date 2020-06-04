const express = require('express');
const router = express.Router();
const {check} = require('express-validator');
const bcrypt = require('bcryptjs');

const isAuth = require('../utils/auth');
const channelRedirect = require('../utils/channel');
const User = require('../models/user');

const controller = require('../controllers/anonycontrollers');
const validators = require('../utils/validators');

router.get('/',controller.gethome);
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
    check('email').isEmail().withMessage('invalid email').trim(),
    check('pwd').isLength({min:5}).withMessage('password too short').custom((val,{req})=>{
        return validators.assertLoginCredentials(val,req)
    }),
] ,controller.loginUser);

router.get('/channel',channelRedirect)
router.get('/userchannel/:id', 
isAuth,
controller.userChannel);

router.get('/sendmsg/:fid', controller.getPostToFeed);
router.post('/feed/:feed', controller.postToFeed);
router.get('/chat/:chatId',isAuth, controller.getChatPage);
router.post('/chatme',isAuth,controller.sendChat)
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
        }).trim(),   
isAuth,controller.modifyPhone)

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
       }).trim()
,isAuth,
controller.modifyEmail)

router.post('/changepassword',
check('new').isLength({min:5}).withMessage('password too short').trim(), 
isAuth, 
controller.changePassword);
router.get('/confirmation',controller.confirmationPage)
router.post('/addchat',controller.addChat)

router.post('/retrievechat',controller.retrieveMoreChats)
router.get('/retrievefeeds',controller.retrieveFeed)
router.post('/chatrequest',controller.chatRequest)
router.get('/retrieverequest',isAuth,controller.retrieveRequests)

router.post('/removeachat',isAuth, controller.removeAChat);
router.post('/togglemode',isAuth, controller.goAnonymous);
router.get('/deleteuseraccount/:id',isAuth,controller.deleteAccount)
router.get('/logout',isAuth, controller.logout);
router.get('/resetpassword',controller.getResetPassword)
router.post('/resetpassword',controller.reset)
router.get('/setnewpassword/:token',controller.getSetNewPassword)
router.post('/setnewpassword',[
    check('pwd').isLength({min:5})
    .withMessage('password too short').custom((val,{req})=>{
        return validators.comfirmNewUserPassword(val,req)
    }),
],controller.setNewPassword)
module.exports = router;