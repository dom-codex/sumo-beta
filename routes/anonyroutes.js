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
check('name').custom((value,{req})=>{
    return validators.comfirmNewUserName(value)
}),
check('email').custom((val,{req})=>{
    return validators.comfirmNewUserEmail(val);
}),
check('phone').custom((val,{req})=>{
    return validators.comfirmNewUserPhone(val);
}),    
check('phone').custom((val,{req})=>{
    return User.findOne({ phone: req.body.phone  })
    .then((user) => {
        if(user){
           return Promise.reject('phone number already taken')
        }
        return true
    })
}),
check('pwd').custom((val,{req})=>{
    return validators.comfirmNewUserPassword(val,req)
})
]
,
controller.createUserChannel);
//validate login credentials
router.post('/loginuser',[
    check('phone').custom((val,{req})=>{
        return validators.comfirmNewUserPhone(val);
    }),
    check('pwd').custom((val,{req})=>{
        return validators.assertLoginCredentials(val,req)
    }),
    //stopped at login validation
    check('phone').custom((val,{req})=>{
        return User.findOne({ phone: req.body.phone  })
        .then((user) => {
          bcrypt.compare(req.body.pwd, user.password)
            .then(result => {
              if (result) {
                return true  
              }else{
                  Promise.reject('invalid phone number or password')
              } 
            }).catch(err=>{
                Promise.reject('invalid credentials')
            }) 
            }).catch(err=>{
                
            })
    })
] ,controller.loginUser);
router.get('/channel',channelRedirect)
router.get('/userchannel/:id', 
isAuth,
controller.userChannel);
router.get('/sendmsg/:fid', controller.getPostToFeed);
router.post('/feed/:feed', controller.postToFeed);
router.get('/chat/:chatId',isAuth, controller.getChatPage);
router.get(
    '/profile/:id',
    isAuth, 
    controller.getProfilePage
    );
router.post('/removeachat',isAuth, controller.removeAChat);
router.post('/changepassword',isAuth, controller.changePassword);
router.get('/logout',isAuth, controller.logout);
router.get('/resetpassword',controller.getResetPassword)
router.post('/resetpassword',controller.reset)
router.get('/setnewpassword/:token',controller.getSetNewPassword)
router.post('/setnewpassword',controller.setNewPassword)
module.exports = router;