const crypto = require("crypto");
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator')
const moment = require('moment');
const User = require("../models/user");
const modes = require("../utils/mode");
const detectors = require('../utils/detectors');
const mailer = require('../utils/mailer').mailer;

const io = require("../socket").getIO;

module.exports.gethome = (req, res, next) => {
  //display success message if suggestion was sent sucessfully
  const didSave = req.flash('saved')
  //render home view
  res.render("home", { save: didSave });
};
module.exports.createChannel = (req, res, next) => {
  //check if user input does not meet requirements
  //send appropriate error messages where neccessary
  const error = req.flash('erros')
  const other = req.flash('otherErr')
  const success = req.flash('success')
  //reformat errors into chunks
  let errors;
  let loginErrors;
  let otherErrors;
 
  if(error.length > 0 && error[0].mode === 'signUp'){
  const nameError =  error[0].errors.find(err=>err.param === 'name')
  const phoneError = error[0].errors.find(err=>err.param === 'phone')
  const passwordError = error[0].errors.find(err=> err.param === 'pwd')
   errors = {
    nameError:{
      isAvailable: nameError ? true :false,
      message:nameError ? nameError.message: '', 
    },   
     phoneError:{
      isAvailable: phoneError ? true : false,
      message:phoneError ? phoneError.message : '', 
    },   
     passwordError:{
      isAvailable: passwordError ? true :false,
      message:passwordError ? passwordError.message: '', 
    },
  }
}
if(error.length > 0 && error[0].mode === 'login'){
  const phoneError = error[0].errors.find(err=>err.param === 'phone')
  const passwordError = error[0].errors.find(err=> err.param === 'pwd')
  loginErrors = {
    phoneError:{
      isAvailable: phoneError ? true : false,
    },   
     passwordError:{
      isAvailable: passwordError ? true :false, 
    },
    mode:true
  }
}
  //const success = req.flash('success')
  res.render("auth", {
    csrfToken: req.csrfToken(),
    loginErrors: loginErrors ? loginErrors :
    {
      phoneError:{
        isAvailable:false,
      },   
       passwordError:{
        isAvailable:false,
      },
      mode: false
    },
    errors: errors ? errors :
      {
        nameError:{
          isAvailable:false,
          message:'', 
        },   
         phoneError:{
          isAvailable:false,
          message:'', 
        },   
         passwordError:{
          isAvailable:false,
          message:'', 
        }, 
      },
    success: success.length > 0 ? true :false//success //if user was created successfully
  });
};
module.exports.createUserChannel = (req, res, next) => {
  //check if there's any error in the inputs supplied
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors.map(err => {
      return {
        param: err.param,
        message: err.msg,
      }
    })
    const err = {
      errors: error,
      mode: 'signUp'
    }
    //store error in flash which will be retrieved
    //in the get route
    req.flash('erros', err);
    return req.session.save(()=>{
     res.redirect('/getstarted')
    })
  }
  //extract user details if no errors
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.pwd;
  const phone = req.body.phone;

  //generate chat hash
  crypto.randomBytes(10, (err, buffer) => {
    const chatString = buffer.toString("hex");
    // generate share hash
    crypto.randomBytes(10, (err, buffer) => {
      const token = buffer.toString("hex");
      //generate anonymous user token
      crypto.randomBytes(12, (err, buffer) => {
        const anonyString = buffer.toString("hex");
        //hash password
        bcrypt.hash(password, 12)
          .then(hash => {
            //create new user
            const user = new User({
              name: name,
              anonymousName: `anonymous${token.substring(4, 8)}`,
              email: email,
              password: hash,
              phone: phone,
              share: token,
              chatShare: chatString,
              anonyString: mongoose.Types.ObjectId(anonyString),
              isAnonymous: false,
              status: "online",
              anonymousStatus: 'offline'
            });
            return user.save()
          })
          .then((user) => {
            //create and store success message then redirect
            req.flash('success', true)
            req.session.save(()=>{
              return res.redirect("/getstarted");
            })
          })
          .catch((err) => {
            next(new Error('connection lost'))
 
          });
      });
    });
  });// end of chat crypto
};
module.exports.loginUser = (req, res, next) => {
  //extract the user details from the request body
  const phone = req.body.phone.toString();
  const password = req.body.pwd;
  //check their validity and notify the user of the wrong input
  const errors = validationResult(req)
  console.log(errors)
  if (!errors.isEmpty() ){
    //reformat the errors if any
    const error = errors.errors.map(err => {
      return {
        param: err.param,
        message: err.msg,
      }
    })
    const err = {
      errors: error,
      mode: 'login'
    }
    req.flash('erros', err);
    return req.session.save(()=>{
      res.redirect('/getstarted')
    })
  }
  //find associated user
  User.findOne({ phone: phone })
    .then((user) => {
      if (!user) {
        throw new Error('not found')
      }
      //validate the password
      bcrypt.compare(password, user.password)
        .then(result => {
          if (result) {
            //initialize a session for them if successful
            req.session.isauth = true;
            req.session.user = user;
            //save session to db and redirect user to main screen
            return req.session.save((err) => {
              res.redirect(`/userchannel/${user._id}`);
            })
          } else {
            //send flash message
            req.flash('erros', {
             errors:[
               {
               param:'phone',
               message:'invalid phone number or password'
             },{
               param:'pwd',
               message:'invalid phone number or password'
             }
            ],
              mode:'login'
            })
            return req.session.save(()=>{
              res.redirect("/getstarted");
            })
          }
        }).catch(err=>{
          console.log('here')
        })
    })
    .catch((err) => {
      //redirect user to getstarted page
      //if any error occurs
      if (err.message === 'not found') {
        req.flash('otherErr', {otherMode:true,message:'invalid credentials'});
        return req.session.save(()=>{
          res.redirect('/getstarted')
      })
      }
    //  next(err)
    });
};
module.exports.getPostToFeed = (req, res, next) => {
  //share token from url
  const fid = req.params.fid;
  //find associated account
  User.findOne({ share: fid })
    .then((result) => {
      if (result !== null) {
        //render view for  user to  send message
        return res.render("replyfeed", {
          csrfToken: req.csrfToken(),
          fid: fid,
          name: result.name
        });
      }
      //take user to home screen if operation fails
      res.redirect("/");
    })
    .catch((err) => {
      next(err)
    });
};
module.exports.userChannel = (req, res, next) => {
  //validate the user id, if not take them to get started page
  if (req.params.id === undefined) {
    return res.redirect('/getstarted')
  }
  //check if id is authentic
  User.findById(req.params.id)
    .then(user => {
      if (!user) {
        //if no associated user throw error
        throw new Error('not found')
      }
      if (!user.isAnonymous) {
        //if user is not in anonymous mode then
        //execute the normal mode controller
        modes.normalUserMode(req, res, next, io);
      } else {
        //else execute the anonymous mode controller
        modes.anonymousUserMode(req, res, next, io);
      }
    }).catch(err => {
      //take user to the get started page if not found error occurs
      if (err.message === 'not found') {
        return res.redirect('/getstarted')
      }
      next(err)
    })
};
module.exports.postToFeed = (req, res, next) => {
  //extract share hash
  const feedString = req.params.feed;
  //extract message
  const message = req.body.message;
  //add time stamp
  const time = moment().format('LT')
  //check if hash is valid
  User.findOne({ share: feedString })
    .then((result) => {
      if (!result) {
        //if invalid take them to the homescreen
        throw new Error('not found')
      }
      //get the user feeds array
      //append the new feeds
      let feeds = result.feeds;
      feeds.push({
        message: message,
        time: time
      });
      result.feeds = feeds;
      //save changes
      result
        .save()
        .then((result) => {
          //send a notifier to the user to update their ui instantly
          io()
            .to(result._id)
            .emit("notification", { message: message, length: result.feeds.length, time: time });

          res.redirect("/");
        })
        .catch((e) => {
          throw e;
        });
    })
    .catch((err) => {
      if (err === 'not found') {
        return res.redirect("/");
      }
      //redirect user to the home screen if any error occurs
      next(err)
    });
};
module.exports.getProfilePage = (req, res, next) => {
  //validate the user id
  if (req.params.id === undefined) {
    return res.redirect('/getstarted')
  }
  //find the associated user either via their id
  //or via their anonymous token
  User.findOne({ $or: [{ _id: req.params.id }, { anonyString: req.params.id }] })
    .then(user => {
      if (!user) {
        //throw error if no user is found
        throw new Error('not found')
      }
      //initialize necessary variables which will be 
      //used to create paginations
      const page = +req.query.page || 1;
      let ntotalOpenUsers;
      let nTotalAnonyUsers;
      let chatids = []
      if (!req.session.isauth) {
        //if user is not authenticated
        //take them to the get started page
        return res.redirect('/getstarted')
      }
      //setup a socket listener
      //this setup should be subject to a cleaner
      //implementation in the stable release
      io().once("connect", (socket) => {
        //the detector ensure user remains online
        /*this is so because each time the socket is
        disconnected an offline timer is set which
        if not intercepted on time will make the
        user appear offline */
        detectors.goOnline(user._id, socket)
        //listener for user who wants to change
        //their display name
        socket.on("newname", (data, fn) => {
          if (!data) return;
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { name: data } }
          ).then((u) => {
            //fn() is called to notifer them of the
            //update
            req.session.user.name = data
            req.session.save(() => {
              fn(); //notify user of the change
            })
          }).catch(err => {
            throw err
          });
        });
        //if socket is disconnected an offline timer
        //will be set
        socket.on('disconnect', () => {
          detectors.goOffline(user._id, socket);
        })

        //listener to add a brief description of user
        socket.on("newdesc", (data, fn) => {
          if (!data) return; //kill execution if no data
          User.updateOne({ _id: req.session.user._id }, { $set: { desc: data } })
            .then(u => {
              req.session.user.desc = data
              req.session.save(() => {
                fn(); //notify user of the change
              })
            }).catch(err => {
              throw err
            })
        });
        //listener for  changing the chat string
        socket.on("newchat", (data, fn) => {
          if (!data) return; //kill execution
          //add validation to ensure string is
          //always unique
          User.find({ chatShare: data })
            //if a user is returned then the id is already taken
            .then(users => {
              if (users.length > 0) {
                fn(true)
              } else {
                User.updateOne({ _id: req.session.user._id }, { $set: { chatShare: data } })
                  .then(u => {
                    req.session.user.chatShare = data
                    req.session.save(() => {
                      fn(); //notify user of the change
                    })
                  }).catch(err => {
                    throw err
                  })
              }
            }).catch(err => {
              next(err)
            })
        });
        //listener to change anonymous name
        socket.on("newanonymous", (data, fn) => {
          if (!data) return; //kill execution
          User.updateOne({ _id: req.session.user._id }, { $set: { anonymousName: data } })
            .then(u => {
              req.session.user.anonymousName = data
              req.session.save(() => {
                fn(); //notify user of the change
              })
            }).catch(err => {
              next(err)
            })
        });
      });
      //pagination implementation
      User.findById(req.session.user._id)
        .then((user) => {
          //filter out open chats id
          const chatid = user.chats.map((id) => {
            return id.chatId;
          });
          //initialize the somewhat global variable
          chatids = chatid
          return chatid
        }).catch(err => {
          throw err
        })
        .then(_ => {
          //get a of users the user  openly chat with
          return User.find({ _id: { $in: chatids } }).countDocuments()
        }).catch(err => {
          throw err
        })
        .then(nOpenUsers => {
          ntotalOpenUsers = nOpenUsers
          return
        }).catch(err => {
          throw err
        })
        .then(_ => {
          //get a count of users who chatted with user anonymously
          return User.find({ anonyString: { $in: chatids } }).countDocuments()
        }).catch(err => {
          throw err
        })
        .then(nAnonymousChats => {
          //initialize the some what global variable
          //to hold the total no of users that chatted with user anonymously
          nTotalAnonyUsers = nAnonymousChats
          return
        }).catch(err => {
          throw err
        })
        .then(_ => {
          /*retrieve actual users we chatted with but limiting
          the no of records returned based on a chosen
          filtering condition i.e max of 2 users per page
           */
          User.find({ _id: { $in: chatids } }).sort('-1').skip((page - 1) * 2)
            .limit(2)
            .then(openchats => {
              /*retrive users that chatted with user anonymously
              limiting the records returned by a chosen preference */
              User.find({ anonyString: { $in: chatids } }).sort('-1').skip((page - 1) * 5)
                .limit(2)
                .then(anonychats => {
                  //reformating the users returned so that their 
                  //actual identity remains protected
                  const anonymousChats = [...anonychats].map(chats => {
                    return {
                      name: chats.anonymousName,
                      _id: chats.anonyString,
                      desc: 'anonymous user',
                      status: chats.anonymousStatus
                    }
                  })
                  let filteredUsersList = [];
                  //format list so that online users appear at the start of the list
                  [...openchats, ...anonymousChats].forEach(user => {
                    if (user.anonymousStatus === 'online' || user.status === 'online' || user.anStatus === 'online') {
                      filteredUsersList.unshift(user)
                    } else {
                      filteredUsersList.push(user)
                    }
                  })
                  //render profile view with data to aid the display of users
                  //and actual pagination
                  //retrieve flash message
                  const error = req.flash('error')
                  const succes = req.flash('success')
                  let errors
                  let success;
                  if(error.length > 0){
                   errors = error[0] 
                  }
                  if(succes.length > 0){
                    success = succes[0]
                  }
                  res.render("profile", {
                    csrfToken: req.csrfToken(),
                    user: req.session.user,
                    chats: [...filteredUsersList],
                    current: page,
                    hasNext: 4 * page < nTotalAnonyUsers + ntotalOpenUsers,
                    hasPrev: page > 1,
                    next: page + 1,
                    prev: page - 1,
                    errors:errors ? errors : {field:'',message:''},
                    success:success ? success : { message:''},
                    total: nTotalAnonyUsers + ntotalOpenUsers,
                    last: Math.ceil((ntotalOpenUsers + nTotalAnonyUsers) / 2)
                  })
                }).catch(err => {
                  next(err)
                })//end of anony chat then
            }).catch(err => {
              next(err)
            })//end of open chat then
        })//end of main then
        .catch((err) => {
          next(err)
        });
    }).catch(err => {
      next(err)
    })
};
module.exports.modifyPhone = (req,res,next)=>{
  const phone = req.body.phone
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    //reformat the errors if any
     const error = errors.errors[0].msg
    //store error in flash which will be retrieved
    //in the get route
    req.flash('error',{field:'phone',message:error})
    return req.session.save(()=>{
     res.redirect(`profile/${req.session.user._id}`)
    })
  }
  if (!phone){
    req.flash('error',{field:'phone',message:'field cannot be empty'})
    return req.session.save(()=>{
      req.redirect(`/profile/${req.session.user._id}`)
    })
  }
  User.updateOne(
    { _id: req.session.user._id },
    { $set: { phone: phone } }
  ).then((u) => {
    req.session.user.phone = phone
    req.flash('success',{message:'phone changed successfully'})
    req.session.save(() => {
       //notify user of the change
       res.redirect(`/profile/${req.session.user._id}`)
    })
  }).catch(err => {
    throw err
  });

}
module.exports.modifyEmail = (req,res,next)=>{
  const email = req.body.email
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    //reformat the errors if any
     const error = errors.errors[0].msg
    //store error in flash which will be retrieved
    //in the get route
    req.flash('error',{field:'email',message:error})
    return req.session.save(()=>{
     res.redirect(`profile/${req.session.user._id}`)
    })
  }
  if (!email){
    req.flash('error',{field:'email',message:'field cannot be empty'})
    return req.session.save(()=>{
      req.redirect(`/profile/${req.session.user._id}`)
    })
  }
  if(!email){
      req.flash('error',{field:'email',message:'field cannot be empty'})
      return req.session.save(()=>{
        req.redirect(`/profile/${req.session.user._id}`)
      })
    }
    User.updateOne(
      { _id: req.session.user._id },
      { $set: { email: email } }
    ).then((u) => {
      req.session.user.email = email
      req.flash('success',{message:'email changed successfully'})
      req.session.save(() => {
         //notify user of the change
         res.redirect(`/profile/${req.session.user._id}`)
      })
    }).catch(err => {
      throw err
    });
}

module.exports.changePassword = (req, res, next) => {
  //retrieve user inputs
  const oldPassword = req.body.old;
  const newPassWord = req.body.new;
  const uid = req.body.uid;
  const errors = validationResult(req)
  console.log(errors)
  if (!errors.isEmpty()) {
    //reformat the errors if any
     const error = errors.errors[0].msg
    //store error in flash which will be retrieved
    //in the get route
    req.flash('error',{field:'new',message:error})
    return req.session.save(()=>{
     res.redirect(`profile/${req.session.user._id}`)
    })
  }
  User.findById(uid)
    .then(user => {
      //compare passwords
      bcrypt.compare(oldPassword, user.password)
        .then(result => {
          console.log(result)
          if (!result) {
            req.flash('error',{field:'old',message:'old password is incorrect'})
            return req.session.save(()=>{
              res.redirect(`profile/${req.session.user._id}`)
             })
            //send flash message that old password is incorrect
            //then reload page with the previously supplied data
          }
          //if inputs are valid
          //create hash of new password and save to db
          bcrypt.hash(newPassWord, 12)
            .then(hash => {
              user.password = hash
              user.save().
                then(user => {
                  console.log('here')
                  req.flash('success',{message:'password changed successfully'})
                  req.session.save(()=>{
                    res.redirect(`/profile/${user._id}`)
                  })
                }).catch(err => {
                  next(err)
                }) //catch of save()
            }) //then block of new hash

        })
    }).catch(err => {
      next(err)
    })
}
module.exports.goAnonymous = (req, res, next) => {
  //find associated user
  User.findById(req.session.user._id)
    .then((user) => {
      if (user.isAnonymous) {
        //check user current mode
        //if user is anonymous we switch them
        //to normal mode
        //update their normal status
        user.isAnonymous = false;
        user.status = 'online';
        user.anonymousStatus = 'offline'
        //clear the anonymous chats
        user.anonyChats = []
        req.session.user = user
        req.session.save(() => {
          // return user.save();
        })
        return user.save();

      } else {
        //if useris not anonymous we switch them
        //to anonymous mode
        user.isAnonymous = true;
        user.status = 'offline';
        user.anonymousStatus = 'online'
        req.session.user = user
        req.session.save(() => {
          // return user.save();
        })
        return user.save();

      }
    }).catch(err => {
      //send a technical error
      throw err
    })
    .then((user) => {
      if (user.isAnonymous) {
        /*if user is anonymous then we send a
        notification to their open chats indicating their
        offline(not truish)*/
        const myChats = [...user.chats];
        myChats.forEach(chats => {
          io().to(chats.chatId)
            .emit('offline', { chat: user._id })
          io().to(`${chats.chatId}${user._id}`)
            .emit('offline', { status: 'offline' })
        })
        //tell anonymous chats user is online
        /*although seems redundant but proper implementation
        will be looked into later */
        const myAchats = [...user.anonyChats];
        myAchats.forEach(chats => {
          io().to(chats.chatId)
            .emit('active', { chat: user.anonyString })
          io().to(`${chats.chatId}${user._id}`)
            .emit('active', { status: 'online' })
        })
      } else {
        //if user was in anonymous mode
        //before switching appear offline to anonymous chats

        const myChats = [...user.anonyChats];
        myChats.forEach(chats => {
          io().to(chats.chatId)
            .emit('offline', { chat: user.anonyString })
          io().to(`${chats.chatId}${user.anonyString}`)
            .emit('offline', { status: 'offline' })
          //tell client the open Auser is offline
        })
        //notify openchats of users presence
        const myoChats = [...user.chats];
        myoChats.forEach(chats => {
          io().to(chats.chatId)
            .emit('active', { chat: user._id })
          io().to(`${chats.chatId}${user._id}`)
            .emit('active', { status: 'online' })
        })
      }
      //update anonymous mode property in  session
      req.session.user.isAnonymous = user.isAnonymous;
      return req.session.save((err) => {
        res.redirect(`profile/${req.session.user._id}`)
        //function to notify switching user that switching process is done
      });
    }).catch(err => {
      next(err)
    });

}
module.exports.getChatPage = (req, res, next) => {
  //check user's mode then execute the necessary logic based on
  //their mode
  if (!req.session.user.isAnonymous) {
    return modes.normalChatMode(req, res, next, io);
  } else {
    modes.anonymousChatMode(req, res, next, io)
  }
};
module.exports.addChat = (req, res, next) => {
  let uid;
  let newChat;
  let me;
  let userId;
  let myChats;
  if(req.session.user.isAnonymous){
  userId = req.session.user.anonyString
  myChats = req.session.user.anonyChats
  }else{
    userId = req.session.user._id
    myChats = req.session.user.chats
  }
  //variable to hold the user details
  //who we want to chat
  const chatString = req.body.chatString; //retrieve the chat string
  //query DB to see if the chatstring exists
  User.findOne({ chatShare: chatString })
    .then((user) => {
      if(!user){
        res.json({
          code:400,
          message:'no user found'
        })
        throw new Error(400)
      }
      //check if user already exists in our list
      const isUser = myChats.some(chat => chat.chatId.toString() === user._id.toString())
      if (isUser) {
          res.json({
          code:400,
          message:'user is already in your chat list'
        })
        throw new Error(400)
      }
      else if (user._id.toString() === userId.toString() || user.anonyString === userId.toString()) {
        //tell user they cant add themselves
        res.json({
          code:400,
          message:'you cannot add your self'
        })
        throw new Error(400)
      } else {
        newChat = user; //intialize variable with owner of chat string
        const chats = user.chats; //initialize variable with the chats array of user
        chats.push({
          chatId: userId, //add the id of the user requesting to join a chat to the requested chat array
          messages: [],
        });
        uid = user._id; //store a copy of the requested  chat id
        user.chats = chats; //store updated version of the requested chat array
        return user.save();
      }
    })
    .catch((err) => {
      throw err
    })
    .then((_) => {
      //retrieve requesting user details on the db
      return User.findById(req.session.user._id);
    })
    .catch((err) => {
      throw err;
    })
    .then((user) => {
      //update chat array of requesting user field with the id of
      // chat 
      me = user;
      const chats = myChats;
      chats.push({
        chatId: uid,
        messages: [],
      });
      if(req.session.user.isAnonymous){
        user.anonyChats = chats
      }else{
        user.chats = chats
      }
      return user.save();
    })
    .catch((err) => {
      throw err;
    })
    .then((_) => {
      //call the callback function passed when requesting user
      //trys to add a chat with the details of the
      //chat
      //inform the chat
      //that user have joined their chat thus
      //their ui can be updated accordingly
      req.session.user = me;
      req.session.save(() => {
        if(req.session.user.isAnonymous){
        io().to(newChat._id).emit("online", {
          name: req.session.user.anonymousName,
          fid: userId,
          anStatus: 'online'
        })}else{
          io().to(newChat._id).emit("online", {
            name: req.session.user.name,
            fid:userId,
            status: 'online'
          })
        }
        res.json({
          code:200,
          newchat:{
            _id:newChat._id,
            name:newChat.name,
            status:newChat.status
          }
        })
        //this is the callback and will update the ui of requesting user
      })
    })

    .catch((err) => {
      //do nothing for now
      console.log(err)
    });

}
module.exports.sendChat = (req, res, next) => {
  const receiver = req.body.receiver;
  const message = req.body.message;
  const time = req.body.time;
  let userId
  User.findById(req.session.user._id)
    .then((user) => {
      //check if user is valid
      if (user.isAnonymous) {
        userId = user.anonyString
      } else {
        userId = user._id
      }
      //retrive the chats array from senders details
      let friends; 
      if(user.isAnonymous){
       friends = user.anonyChats
      }else{
        friends = user.chats
      }
      //user.chats;
      friends = friends.map((chats) => {
        if (chats.chatId.toString() === receiver.toString()) {
          //add message to chat messages array in user chats
          let msgs = chats.messages;
          msgs.push({
            sender: userId,
            receiver: receiver,
            body: message,
            isMsgNew: false,
            time: time
          });
          chats.messages = msgs;
          return chats;
        } else {
          return chats; //to keep all other chats
        }
      });
      if(user.isAnonymous){
        user.anonyChats = friends
      }else{
        user.chats = friends;
      }
      return user.save();
    })
    .catch((err) => {
      throw new Error('no user found');
    })
    .then((_) => {
      //get chat depending if they are in normal mode or anonymous mode
      return User.findOne({ $or: [{ _id: receiver.toString() }, { anonyString: receiver.toString() }] });
    })
    .then((sendee) => {
      // check if sendee was foubd
      if (!sendee) {
        throw new Error('no user found')
      }
      //check if user is anonymous and execute appropriate code
      if (sendee.anonyString.toString() === receiver.toString()) {
        let friends = sendee.anonyChats;
        friends = friends.map((chats) => {
          if (
            chats.chatId.toString() === userId.toString()
          ) {

            let msgs = chats.messages;
            msgs.push({
              sender: userId,
              receiver: receiver,
              body: message,
              isMsgNew: true,
              time: time
            });
            chats.messages = msgs;
            return chats;
          }
          else {
            return chats; //to keep all other chats
          }
        });
        return sendee.save();

      } else {
        //to be execute if user in normal mode
        let friends = sendee.chats;
        friends = friends.map((chats) => {
          if (
            chats.chatId.toString() === userId.toString()
          ) {
            //add message to messages array

            let msgs = chats.messages;
            msgs.push({
              sender: userId,
              receiver: receiver,
              body: message,
              isMsgNew: true,
              time: time
            });
            chats.messages = msgs;
            return chats;
          }
          else {
            return chats; //to keep all other chats
          }
        });

        return sendee.save()
      }
    })
    .catch((err) => {
      throw err;
    })
    .then((result) => {
      //inform user of new message if not in chat window
      io()
        .to(receiver)
        .emit("notify", { id: userId, msg: message, time: time });
      //in the notify emitter return the friend id

      //update ui of receipient if in chat room

      io().to(`${receiver}${userId}`).emit("chatMsg", {
        message: message,
        time: time
      });
      res.json({
        code: 200,
        message: 'sent sucessfully'
      })
    })
    .catch((err) => {
      console.log(err)
    });

}
module.exports.removeAChat = (req, res, next) => {
  User.findById(req.session.user._id)
    .then(user => {
      //filter out unwanted user from chat list
      const filteredList = [...user.chats].filter(chat => chat.chatId.toString() !== req.body.uid.toString())
      user.chats = filteredList
      return user.save()
    }).catch(err => {
      throw err
    })
    .then(user => {
      //take user to profile page after execution
      req.session.user = user
      return req.session.save(()=>{
        res.redirect(`/profile/${user._id}`)

      })
    }).catch(err => {
      next(err)
    })
};
module.exports.logout = (req, res, next) => {
  //destroy users session
  req.session.destroy((err) => {
    res.redirect('/getstarted')
  })
}
module.exports.getResetPassword = (req, res, next) => {
  const noUserFound = req.flash('noUser')
  const success = req.flash('success')
  res.render('reset', {
    csrfToken: req.csrfToken(),
    noUser: noUserFound,
    success: success,
    message: noUserFound.length > 0 ? noUserFound[0].message : ''
  })
}
module.exports.reset = (req, res, next) => {
  const phone = req.body.phone;
  const email = req.body.email;
  User.findOne({ phone: phone })
    .then(user => {
      if (!user) {
        // tell user details is incorrect
        req.flash('noUser', { message: 'invalid credentials' })
        return req.session.save(()=>{
         res.redirect('/resetpassword')
        })
      }
      //verify user phone
      if (user.email !== email) {
        //tell user email is invalid
        req.flash('noUser', { message: 'invalid email' })
        return req.session.save(()=>{
          return res.redirect('/resetpassword')
        })
      }
      //generate reset token if all goes well
      crypto.randomBytes(24, (err, buffer) => {
        const token = buffer.toString("hex");
        //save token to users records
        user.resetToken = token;
        //a timestamp to it
        user.tokenMaxAge = Date.now() + 1000 * 60 * 5
        user.save(_ => {
          //send the link to user's email 
          mailer(req, res, user.email, user.name, token)

        })
      })
    }).catch(err => {
      next(err)
    })
}
module.exports.getSetNewPassword = (req, res, next) => {
  //get the token
  const token = req.params.token;
  //validate the token
  User.findOne({ resetToken: token })
    .then(user => {
      if (!user) {
        // send an invalid token message
        //to the password reset home
        req.flash('noUser', { message: 'invalid token' })
        return req.session.save(()=>{
           res.redirect('/resetpassword')
        })
      }
      //check if the token has expired
      if (user.tokenMaxAge < Date.now()) {
        //send a message telling user the token has expired
        req.flash('noUser', { message: 'token already expired' })
       return req.session.save(()=>{
        return res.redirect('/resetpassword')
       })
      }
      //if all goes well render the set new page
      const noUserFound = req.flash('noUser')
      const message = noUserFound.length > 0 ? noUserFound[0].message : ''
      res.render('setNew.ejs', {
        csrfToken: req.csrfToken(),
        noUser: noUserFound,
        success: [],
        message: message,
        token: token
      })
    }).catch(err => {
      next(err)
    })
}
module.exports.setNewPassword = (req, res, next) => {
  //retrieve the token from the link
  const token = req.body.token
  const password = req.body.pwd;
  const confirmPassword = req.body.cpwd;
  //validate the password if its empty
  //use the token to get the user
  const errors = validationResult(req)
  console.log(errors)
  if (!errors.isEmpty()) {
    //reformat the errors if any
    req.flash('noUser', { message: errors.errors[0].msg })
    return req.session.save(()=>{
       res.redirect(`/setnewpassword/${token}`)
    })
    //store error in flash which will be retrieved
    //in the get route
  /*  req.flash('erros', err);
    return req.session.save(()=>{
     res.redirect('/getstarted')
    })*/
  }
  User.findOne({ resetToken: token })
    .then(user => {
      if (!user) {
        // tell user token is invalid
        req.flash('noUser', { message: 'invalid token' })
        return req.session.save(()=>{
           res.redirect('/resetpassword')
        })
      }
      //check if token is expired
      if (user.tokenTime < Date.now()) {
        //tell user token has expired    
        req.flash('noUser', { message: 'token already expired' })
        return req.session.save(()=>{
          return res.redirect('/resetpassword')
        })
      }
      if (password !== confirmPassword) {
        //tell user the password does not match
        req.flash('noUser', { message: 'passwords do not match' })
        return req.session.save(()=>{
          return res.redirect(`/setnewpassword/${token}`)
        })
      }
      //hash the new pass word
      bcrypt.hash(password, 12)
        .then(hash => {
          user.password = hash;
          user.resetToken = '';
          user.tokenMaxAge = ''
          return user.save()
        })
        .then(user => {
          //tell user they can now login
          req.flash('success', true)
          return req.session.save(()=>{
            res.redirect('/getstarted')
          })
        })
    }).catch(err => {
      next(err)
    })

}
