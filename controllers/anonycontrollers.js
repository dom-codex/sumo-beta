const crypto = require("crypto");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { validationResult } = require("express-validator");
const moment = require("moment");
const User = require("../models/user");
const Message = require("../models/messages");
const Feed = require("../models/feed");
const modes = require("../utils/mode");
const detectors = require("../utils/detectors");
const mailer = require("../utils/mailer");
const jwt = require("jsonwebtoken");
const validator = require('validator');

const io = require("../socket").getIO;
module.exports.gethome = (req, res, next) => {
  //display success message if suggestion was sent sucessfully
  const didSave = req.flash("saved");
  //render home view

  res.render("home", {
    save: didSave,
  });
};
module.exports.about = (req, res, next) => {
  //render about view
  res.render("about");
};
module.exports.createChannel = (req, res, next) => {
  //retrieve query parameter
  const toLogin = req.query.login || false;
  //check if user input does not meet requirements
  //send appropriate error messages where neccessary
  const error = req.flash("erros");
  const other = req.flash("otherErr");
  const success = req.flash("success");
  const val = req.flash("val")[0];
  //reformat errors into chunks
  let errors;
  let loginErrors;
  if (error.length > 0 && error[0].mode === "signUp") {
    const nameError = error[0].errors.find((err) => err.param === "name");
    const emailError = error[0].errors.find((err) => err.param === "email");
    const phoneError = error[0].errors.find((err) => err.param === "phone");
    const passwordError = error[0].errors.find((err) => err.param === "pwd");
    errors = {
      nameError: {
        isAvailable: nameError ? true : false,
        message: nameError ? nameError.message : "",
        value: nameError ? nameError.value : val.name,
      },
      emailError: {
        isAvailable: emailError ? true : false,
        message: emailError ? emailError.message : "",
        value: emailError ? emailError.value : val.email,
      },
      phoneError: {
        isAvailable: phoneError ? true : false,
        message: phoneError ? phoneError.message : "",
        value: phoneError ? phoneError.value : req.body.phone,
      },
      passwordError: {
        isAvailable: passwordError ? true : false,
        message: passwordError ? passwordError.message : "",
      },
    };
  }
  if (error.length > 0 && error[0].mode === "login") {
    const emailError = error[0].errors.find((err) => err.param === "email");
    const passwordError = error[0].errors.find((err) => err.param === "pwd");
    loginErrors = {
      emailError: {
        isAvailable: emailError ? true : false,
      },
      passwordError: {
        isAvailable: passwordError ? true : false,
      },
      mode: true,
    };
  }
  //const success = req.flash('success')

  res.render("auth", {
    isErr:error.length > 0,
    other:
      other.length > 0
        ? other[0]
        : {
            isSet: false,
            message: "",
          },
    loginErrors: loginErrors
      ? loginErrors
      : {
          emailError: {
            isAvailable: false,
          },
          passwordError: {
            isAvailable: false,
          },
          mode: false,
        },
    errors: errors
      ? errors
      : {
          nameError: {
            isAvailable: false,
            message: "",
          },
          emailError: {
            isAvailable: false,
            message: "",
          },
          phoneError: {
            isAvailable: false,
            message: "",
          },
          passwordError: {
            isAvailable: false,
            message: "",
          },
        },
    toLogin: toLogin,
    success: success.length > 0 ? true : false, //success //if user was created successfully
  });
};
module.exports.createUserChannel = (req, res, next) => {
  //check if there's any error in the inputs supplied
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.pwd;
  const phone = req.body.phone;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors.map((err) => {
      return {
        param: err.param,
        message: err.msg,
        value: err.value,
      };
    });
    const err = {
      errors: error,
      mode: "signUp",
    };
    //store error in flash which will be retrieved
    //in the get route
    req.flash("erros", err);
    req.flash('val',{email:email,name:name});
    return req.session.save(() => {

      res.redirect("/getstarted");
    });
  }
  //extract user details if no errors

  //generate refreshToken
  crypto.randomBytes(24, (err, buffer) => {
    const userToken = buffer.toString("hex");
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
          bcrypt
            .hash(password, 32)
            .then((hash) => {
              //create new user
              const user = new User({
                name: name,
                anonymousName: `anonymous${token.substring(4, 8)}`,
                email: email,
                password: hash,
                phone: phone,
                share: token,
                userToken: userToken,
                desc: `# iam ${name}`,
                chatShare: chatString,
                anonyString: mongoose.Types.ObjectId(anonyString),
                isAnonymous: false,
                status: "online",
                anonymousStatus: "offline",
              });
              return user.save();
            })
            .then((user) => {
              //create and store success message then redirect
              // req.flash('success', true)
              const toks = jwt.sign(
                { toks: userToken },
                process.env.signMeToken
              );
              mailer.confirmationMailer(user.email, user.name, user._id, toks);
              return res.redirect("/confirmation");
            })
            .catch((err) => {
              next(new Error("connection lost"));
            });
        });
      });
    }); // end of chat crypto
  });
};
module.exports.confirmationPage = (req, res, next) => {
  res.render("confirmation");
};
module.exports.loginUser = (req, res, next) => {
  //extract the user details from the request body
  const email = req.body.email;
  const password = req.body.pwd;
  //check their validity and notify the user of the wrong input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors.map((err) => {
      return {
        param: err.param,
        message: err.msg,
      };
    });
    const err = {
      errors: error,
      mode: "login",
    };
    req.flash("erros", err);
    return req.session.save(() => {
      res.redirect("/getstarted");
    });
  }
  //find associated user
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        throw new Error("not found");
      } else if (!user.isVerified) {
        throw new Error("no verified");
      }
      //validate the password
      bcrypt
        .compare(password, user.password)
        .then((result) => {
          if (result) {
            //initialize a session for them if successful
            const userToks = jwt.sign(
              { ref: user.userToken },
              process.env.signMeToken
            );
            res.clearCookie("sumo.toks");
            res.cookie("sumo.toks", userToks, {
              maxAge: 1000 * 60 * 60,
              httpOnly: true,
            });
            req.session.isauth = true;
            req.session.user = user;
            req.session.isVerified = user.isVerified;
            //save session to db and redirect user to main screen
            return req.session.save((err) => {
              res.redirect(`/userchannel/${user._id}`);
            });
          } else {
            //send flash message
            req.flash("erros", {
              errors: [
                {
                  param: "phone",
                  message: "invalid phone number or password",
                },
                {
                  param: "pwd",
                  message: "invalid phone number or password",
                },
              ],
              mode: "login",
            });
            return req.session.save(() => {
              res.redirect("/getstarted");
            });
          }
        })
        .catch((err) => {});
    })
    .catch((err) => {
      //redirect user to getstarted page
      //if any error occurs
      if (err.message === "not found") {
        req.flash("otherErr", { isSet: true, message: "invalid credentials" });
        return req.session.save(() => {
          res.redirect("/getstarted");
        });
      } else if (err.message === "no verified") {
        req.flash("otherErr", { isSet: true, message: "user is not verified" });
        return req.session.save(() => {
          res.redirect("/getstarted");
        });
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
          fid: fid,
          name: result.name,
        });
      }
      //take user to home screen if operation fails
      res.redirect("/");
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.userChannel = (req, res, next) => {
  //validate the user id, if not take them to get started page
  if (req.params.id === undefined) {
    return res.redirect("/getstarted");
  }
  //check if id is authentic
  User.findOne({$or:[{_id:req.params.id},{anonyString:req.params.id}]})
    .then((user) => {
      if (!user) {
        //if no associated user throw error
        throw new Error("not found");
      }
      if (!user.isAnonymous) {
        //if user is not in anonymous mode then
        //execute the normal mode controller
        modes.normalUserMode(req, res, next, io);
      } else {
        //else execute the anonymous mode controller
        modes.anonymousUserMode(req, res, next, io);
      }
    })
    .catch((err) => {
      //take user to the get started page if not found error occurs
      if (err.message === "not found") {
        return res.redirect("/getstarted");
      }
      if (err.name == "CastError") {
        next(err);
      }
      next(err);
    });
};
module.exports.postToFeed = (req, res, next) => {
  //extract share hash
  const feedString = req.params.feed;
  //extract message
  const message = req.body.message;
  //add time stamp
  const time = moment().format("LT");
  //check if hash is valid
  const feed = new Feed({
    user: feedString,
    message: message,
    time: time,
  });
  return feed
    .save()
    .then((_) => {
      return Feed.find({ user: feedString }).countDocuments();
    })
    .then((nfeeds) => {
      User.findOne({ share: feedString })
        .then((result) => {
          if (!result) {
            //if invalid take them to the homescreen
            throw new Error("not found");
          }
          //send a notifier to the user to update their ui instantly
          io()
            .to(result._id)
            .emit("notification", {
              message: message,
              length: nfeeds,
              time: time,
            });
          io()
            .to(result.anonyString)
            .emit("notification", {
              message: message,
              length: nfeeds,
              time: time,
            });

          res.redirect("/");
        })
        .catch((e) => {
          throw e;
        });
    })
    .catch((err) => {
      if (err === "not found") {
        return res.redirect("/");
      }
      //redirect user to the home screen if any error occurs
      next(err);
    });
};
module.exports.getProfilePage = (req, res, next) => {
  //validate the user id
  const myId = req.params.id.toString();
  if (req.params.id === undefined) {
    return res.redirect("/getstarted");
  }
  //find the associated user either via their id
  //or via their anonymous token
  let me;
  /*User.findOne({ $or: [{ _id: myId }, 
    { anonyString: myId }] })*/
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        //throw error if no user is found
        throw new Error("not found");
      }
      me = user;
      const img = user.images.open.link || "";
      const page = +req.query.page || 1;
      const images = user.images.anonymous.link || "";
      if (!req.session.isauth) {
        //if user is not authenticated
        //take them to the get started page
        return res.redirect("/getstarted");
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
        detectors.goOnline(user._id, socket);
        //listener for user who wants to change
        //their display name
        socket.on("newname", (data, fn) => {
          const name = validator.escape(data)
          if (!data) return;
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { name: name } }
          )
            .then((u) => {
              //fn() is called to notifer them of the
              //update
              req.session.user.name = name;
              req.session.save(() => {
                fn(); //notify user of the change
              });
            })
            .catch((err) => {
              throw err;
            });
        });
        //if socket is disconnected an offline timer
        //will be set
        socket.on("disconnect", () => {
          detectors.goOffline(user._id, socket);
        });

        //listener to add a brief description of user
        socket.on("newdesc", (data, fn) => {
          const desc = validator.escape(data)
          if (!data) return; //kill execution if no data
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { desc: desc } }
          )
            .then((u) => {
              req.session.user.desc = desc;
              req.session.save(() => {
                fn(); //notify user of the change
              });
            })
            .catch((err) => {
              throw err;
            });
        });
        //listener for  changing the chat string
        socket.on("newchat", (data, fn) => {
          if (!data) return; //kill execution
          //add validation to ensure string is
          //always unique
          User.find({ chatShare: data })
            //if a user is returned then the id is already taken
            .then((users) => {
              const chat = validator.escape(data)
              if (users.length > 0) {
                fn(true);
              } else {
                User.updateOne(
                  { _id: req.session.user._id },
                  { $set: { chatShare: chat_v1 } }
                )
                  .then((u) => {
                    req.session.user.chatShare = chat;
                    req.session.save(() => {
                      fn(); //notify user of the change
                    });
                  })
                  .catch((err) => {
                    throw err;
                  });
              }
            })
            .catch((err) => {
              next(err);
            });
        });
        //listener to change anonymous name
        socket.on("newanonymous", (data, fn) => {
          if (!data) return; //kill execution
          const a = validator.escape(data)
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { anonymousName: data } }
          )
            .then((u) => {
              req.session.user.anonymousName = a;
              req.session.save(() => {
                fn(); //notify user of the change
              });
            })
            .catch((err) => {
              next(err);
            });
        });
      });
      if (me.isAnonymous) {
        return require("../helpers/profileAnonymous").profileAnonymous(
          req,
          res,
          next,
          images
        );
      }
      //pagination implementation
      User.findById(req.session.user._id)
        .then((user) => {
          //filter out open chats id
          const chatid = user.chats.map((id) => {
            return id.chatId;
          });
          //initialize the somewhat global variable

          //retrieve flash message
          const error = req.flash("error");
          const succes = req.flash("success");
          let errors;
          let success;
          if (error.length > 0) {
            errors = error[0];
          }
          if (succes.length > 0) {
            success = succes[0];
          }
          req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :''
          res.render("profile", {
            user: me,
            img: img,
            chats: [],
            current: page,
            anonymous: user.isAnonymous ? true : false,
            errors: errors ? errors : { field: "", message: "" },
            success: success ? success : { message: "" },
          });
        })
        .catch((err) => {
          next(err);
        }); //end of anony chat then
    })
    .catch((err) => {
      next(err);
    })
    .catch((err) => {
      next(err);
    }); //end of open chat then
  //end of main then
};
module.exports.modifyPhone = (req, res, next) => {
  const phone = req.body.phone;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors[0].msg;
    //store error in flash which will be retrieved
    //in the get route
    req.flash("error", { field: "phone", message: error });
    return req.session.save(() => {
      res.redirect(`profile/${req.session.user._id}`);
    });
  }
  if (!phone) {
    req.flash("error", { field: "phone", message: "field cannot be empty" });
    return req.session.save(() => {
      req.redirect(`/profile/${req.session.user._id}`);
    });
  }
  User.updateOne({ _id: req.session.user._id }, { $set: { phone: phone } })
    .then((u) => {
      req.session.user.phone = phone;
      req.flash("success", { message: "phone changed successfully" });
      req.session.save(() => {
        //notify user of the change
        res.redirect(`/profile/${req.session.user._id}`);
      });
    })
    .catch((err) => {
      throw err;
    });
};
module.exports.modifyEmail = (req, res, next) => {
  const email = req.body.email;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors[0].msg;
    //store error in flash which will be retrieved
    //in the get route
    req.flash("error", { field: "email", message: error });
    return req.session.save(() => {
      res.redirect(`profile/${req.session.user._id}`);
    });
  }
  if (!email) {
    req.flash("error", { field: "email", message: "field cannot be empty" });
    return req.session.save(() => {
      req.redirect(`/profile/${req.session.user._id}`);
    });
  }
  if (!email) {
    req.flash("error", { field: "email", message: "field cannot be empty" });
    return req.session.save(() => {
      req.redirect(`/profile/${req.session.user._id}`);
    });
  }
  User.updateOne({ _id: req.session.user._id }, { $set: { email: email } })
    .then((u) => {
      req.session.user.email = email;
      req.flash("success", { message: "email changed successfully" });
      req.session.save(() => {
        //notify user of the change
        res.redirect(`/profile/${req.session.user._id}`);
      });
    })
    .catch((err) => {
      throw err;
    });
};

module.exports.changePassword = (req, res, next) => {
  //retrieve user inputs
  const oldPassword = req.body.old;
  const newPassWord = req.body.new;
  const uid = req.body.uid;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    const error = errors.errors[0].msg;
    //store error in flash which will be retrieved
    //in the get route
    req.flash("error", { field: "new", message: error });
    return req.session.save(() => {
      res.redirect(`profile/${req.session.user._id}`);
    });
  }
  User.findById(uid)
    .then((user) => {
      //compare passwords
      bcrypt.compare(oldPassword, user.password).then((result) => {
        if (!result) {
          req.flash("error", {
            field: "old",
            message: "old password is incorrect",
          });
          return req.session.save(() => {
            res.redirect(`profile/${req.session.user._id}`);
          });
          //send flash message that old password is incorrect
          //then reload page with the previously supplied data
        }
        //if inputs are valid
        //create hash of new password and save to db
        bcrypt.hash(newPassWord, 12).then((hash) => {
          user.password = hash;
          user
            .save()
            .then((user) => {
              console.log("here");
              req.flash("success", {
                message: "password changed successfully",
              });
              req.session.save(() => {
                res.redirect(`/profile/${user._id}`);
              });
            })
            .catch((err) => {
              next(err);
            }); //catch of save()
        }); //then block of new hash
      });
    })
    .catch((err) => {
      next(err);
    });
};
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
        user.status = "online";
        user.anonymousStatus = "offline";
        req.session.user = user;
        req.session.save(() => {
          // return user.save();
        });
        return user.save();
      } else {
        //if useris not anonymous we switch them
        //to anonymous mode
        user.isAnonymous = true;
        user.status = "offline";
        user.anonymousStatus = "online";
        req.session.user = user;
        req.session.save(() => {
          // return user.save();
        });
        return user.save();
      }
    })
    .catch((err) => {
      //send a technical error
      throw err;
    })
    .then((user) => {
      if (user.isAnonymous) {
        /*if user is anonymous then we send a
        notification to their open chats indicating their
        offline(not truish)*/
        const myChats = [...user.chats];
        myChats.forEach((chats) => {
          io().to(chats.chatId).emit("offline", { chat: user._id });
          io()
            .to(`${chats.chatId}${user._id}`)
            .emit("offline", { status: "offline" });
        });
        //tell anonymous chats user is online
        /*although seems redundant but proper implementation
        will be looked into later */
        const myAchats = [...user.anonyChats];
        myAchats.forEach((chats) => {
          io().to(chats.chatId).emit("active", { chat: user.anonyString });
          io()
            .to(`${chats.chatId}${user._id}`)
            .emit("active", { status: "online" });
        });
      } else {
        //if user was in anonymous mode
        //before switching appear offline to anonymous chats

        const myChats = [...user.anonyChats];
        myChats.forEach((chats) => {
          io().to(chats.chatId).emit("offline", { chat: user.anonyString });
          io()
            .to(`${chats.chatId}${user.anonyString}`)
            .emit("offline", { status: "offline" });
          //tell client the open Auser is offline
        });
        //notify openchats of users presence
        const myoChats = [...user.chats];
        myoChats.forEach((chats) => {
          io().to(chats.chatId).emit("active", { chat: user._id });
          io()
            .to(`${chats.chatId}${user._id}`)
            .emit("active", { status: "online" });
        });
      }
      //update anonymous mode property in  session
      req.session.user.isAnonymous = user.isAnonymous;
      return req.session.save((err) => {
        res.redirect(`profile/${user._id}`);
        //function to notify switching user that switching process is done
      });
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.getChatPage = (req, res, next) => {
  //check user's mode then execute the necessary logic based on
  //their mode
  const id = req.params.chatId;
  User.findOne({ $or: [{ _id: id }, { anonyString: id }] }).then((user) => {
    if (!user) {
      req.flash("inform", {
        status: true,
        msg: "user does not exist",
      });
      return req.session.save(() => {
        res.redirect(`/userchannel/${req.session.user._id}`);
      });
    }
    if (!req.session.user.isAnonymous) {
      return modes.normalChatMode(req, res, next, io);
    } else {
      modes.anonymousChatMode(req, res, next, io);
    }
  });
};
module.exports.addChat = (req, res, next) => {
  let uid;
  let newChat;
  let me;
  let userId;
  let myChats;
  let Auser;
  User.findById(req.session.user._id).then((user) => {
    if (user.isAnonymous) {
      userId = user.anonyString;
      myChats = user.anonyChats;
      Auser = {
        name: user.anonymousName,
        desc: "anonymous user",
        img: user.images.anonymous.link,
      };
    } else {
      userId = user._id;
      myChats = user.chats;
      Auser = {
        name: user.name,
        desc: user.desc,
        img: user.images.open.link,
      };
    }
    //variable to hold the user details
    //who we want to chat
    const chatString = req.body.chatString; //retrieve the chat string
    //query DB to see if the chatstring exists
    User.findOne({ chatShare: chatString })
      .then((user) => {
        if (!user) {
          res.json({
            code: 400,
            message: "no user found",
          });
          throw new Error(400);
        }
        //check if user already exists in our list
        const isUser = myChats.some(
          (chat) => chat.chatId.toString() === user._id.toString()
        );
        const alreadySent = user.requests.some(
          (request) => request.id.toString() === userId.toString()
        );
        if (isUser) {
          res.json({
            code: 400,
            message: "user is already in your chat list",
          });
          throw new Error(400);
        }
        if (
          user._id.toString() === userId.toString() ||
          user.anonyString.toString() === userId.toString()
        ) {
          //tell user they cant add themselves
          res.json({
            code: 400,
            message: "you cannot add your self",
          });
          throw new Error(400);
        } else if (alreadySent) {
          //tell user they cant add themselves
          res.json({
            code: 400,
            message: "request already sent",
          });
          throw new Error(400);
        } else {
          newChat = user; //intialize variable with owner of chat string
          //const chats = user.chats; //initialize variable with the chats array of user
          const request = user.requests;
          request.push({
            id: userId,
            name:
              Auser.name.length > 9
                ? Auser.name.substring(0, 6) + "..."
                : Auser.name,
            desc: Auser.desc,
            img: Auser.img,
          });
          /*chats.push({
              lastUpdate: new Date(),
              chatId: userId, //add the id of the user requesting to join a chat to the requested chat array
              messages: [],
            });*/
          uid = user._id; //store a copy of the requested  chat id
          user.requests = request;
          //user.chats = chats; //store updated version of the requested chat array
          return user.save();
        }
      })
      .catch((err) => {
        throw err;
      })
      .then((newchat) => {
        newChat = newchat;
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
        /* const chats = myChats;
           chats.push({
             lastUpdate: new Date(),
             chatId: uid,
             messages: [],
           });
           if (req.session.user.isAnonymous) {
             user.anonyChats = chats
           } else {
             user.chats = chats
           }
           return user.save();*/
        return;
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
        // req.session.user = me;
        /* io().to(newChat._id).emit("online", {
             name: req.session.user.anonymousName,
             fid: userId,
             anStatus: 'online' 
           })*/

        /* io().to(newChat._id).emit("online", {
             name: req.session.user.name,
             fid: userId,
             status: 'online'
           }) */
        io()
          .to(newChat._id)
          .emit("new", {
            name: Auser.name.substring(0, 5) + "...",
            fid: userId,
            status: "online",
            img: Auser.img,
            desc: Auser.desc,
            requests: newChat.requests.length,
          });

        res.json({
          code: 200,
          message: "request sent successfully",
        });
        /*res.json({
            code: 200,
            newchat: {
              _id: newChat._id,
              name: newChat.name,
              status: newChat.status
            }
          })*/
        //this is the callback and will update the ui of requesting user
      })

      .catch((err) => {
        //do nothing for now
        console.log(err);
      });
  });
};
module.exports.chatRequest = (req, res, next) => {
  const id = req.body.id;
  const state = req.body.state;
  const { anonyString, _id } = req.session.user;
  let chatAccepter;
  //check if id  affiliated to user
  if (id.toString() == _id.toString()) {
    return;
  } else if (id.toString() === anonyString.toString()) {
    return;
  } else if (state === "grant") {
    // get user from db
    User.findById(req.session.user._id)
      .then((user) => {
        if (!user) return;
        chatAccepter = user;
        const requests = user.requests.filter(
          (request) => request.id.toString() !== id.toString()
        );
        const chats = user.chats;
        chats.push({
          lastUpdate: new Date(),
          chatId: id,
          messages: [],
        });
        user.requests = requests;
        user.chats = chats;
        return user.save();
      })
      .then((user) => {
        chatAccepter = user;
        return User.findOne({ $or: [{ _id: id }, { anonyString: id }] }).select(
          "-password -phone -email -messages -feeds"
        );
      })
      .then((user) => {
        let chats;
        if (user.isAnonymous) {
          chats = user.anonyChats;
        } else {
          chats = user.chats;
        }
        chats.push({
          lastUpdate: new Date(),
          chatId: req.session.user._id,
          messages: [],
        });
        if (user.isAnonymous) {
          user.anonyChats = chats;
        } else {
          user.chats = chats;
        }
        return user.save();
      })
      .then((user) => {
        const name = req.session.user.name;
        io()
          .to(id)
          .emit("online", {
            name: name.length > 9 ? name.substring(0, 6) + "..." : name,
            fid: req.session.user._id,
            status: "online",
            img: chatAccepter.images.open.link,
          });
        if (user.isAnonymous) {
          const name = req.session.user.anonymousName;
          res.json({
            code: 200,
            newchat: {
              _id: user.anonyString,
              name: name.length > 9 ? name.substring(0, 6) + "..." : name,
              status: user.anonymousStatus,
              img: user.images.anonymous.link,
              nreq: chatAccepter.requests.length,
            },
          });
        } else {
          const name = user.name;
          res.json({
            code: 200,
            newchat: {
              _id: user._id,
              name: name.length > 9 ? name.substring(0, 6) + "..." : name,
              status: user.status,
              img: user.images.open.link,
              nreq: chatAccepter.requests.length,
            },
          });
        }
      });
  } else if (state === "decline") {
    let me;
    User.findById(req.session.user._id)
      .then((user) => {
        let requests = user.requests;
        requests = requests.filter(
          (request) => request.id.toString() !== id.toString()
        );
        user.requests = requests;
        return user.save();
      })
      .then((user) => {
        me = user;
        return User.findOne({ $or: [{ _id: id }, { anonyString: id }] });
      })
      .then((user) => {
        if (user.isAnonymous) {
          res.json({
            code: 301,
            newchat: {
              _id: user.anonyString,
              nreq: me.requests.length,
            },
          });
        } else {
          res.json({
            code: 301,
            newchat: {
              _id: user._id,
              nreq: me.requests.length,
            },
          });
        }
      });
  }
};
module.exports.retrieveRequests = (req, res, next) => {
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) return;
      //return user.populate('requests.chat').execPopulate()
      return user;
    })
    .then((user) => {
      //retrieve the full doc
      if (!user) return;
      res.json({
        code: 200,
        requests: user.requests,
        requestLength: user.requests.length,
      });
    });
};
module.exports.sendChat = (req, res, next) => {
  const receiver = req.body.receiver;
  const message = req.body.message;
  const time = req.body.time;
  let pal;
  let userId;
  let msgID;
  User.findById(req.session.user._id)
    .then(async (user) => {
      let chat;
      for await (let pally of User.findOne({
        $or: [{ _id: receiver }, { anonyString: receiver }],
      }).select("chats anonyChats isAnonymous")) {
        if (pally.isAnonymous) {
          chat = pally.anonyChats;
        } else {
          chat = pally.chats;
        }
      }
      //check if user is valid
      if (user.isAnonymous) {
        userId = user.anonyString;
        pal = user.anonymousName;
      } else {
        userId = user._id;
        pal = user.name;
      }
      //retrive the chats array from senders details
      let friends;
      if (user.isAnonymous) {
        friends = user.anonyChats;
      } else {
        friends = user.chats;
      }
      //check if user is no longer friends with chat
      const stillPals = chat.some(
        (f) => f.chatId.toString() === userId.toString()
      );
      if (!stillPals) {
        return res.json({
          code: 300,
          message:
            "message not sent because you are no longer pals with this user",
        });
      };
      const messages = new Message({
        sender: userId,
        receiver: receiver,
        time: time,
        body: message,
        isMsgNew: true,
        isMsgNewSender: false,
      });
      messages
        .save()
        .then((message) => {
          msgID = message._id;
          friends = friends.map((chats) => {
            if (chats.chatId.toString() === receiver.toString()) {
              //add message to chat messages array in user chats
              chats.lastUpdate = new Date();
              /* let msgs = chats.messages;
              msgs[0] = message._id
              chats.messages = msgs;*/
              return chats;
            } else {
              return chats; //to keep all other chats
            };
          });
          if (user.isAnonymous) {
            user.anonyChats = friends;
            // req.session.user.anonyChats = friends
            // req.session.save()
          } else {
            user.chats = friends;
            // req.session.user.chats = friends
            // req.session.save()
          }
          return user.save();
        })
        .catch((err) => {
          throw new Error("no user found");
        })
        .then((_) => {
          //get chat depending if they are in normal mode or anonymous mode
          return User.findOne({
            $or: [
              { _id: receiver.toString() },
              { anonyString: receiver.toString() },
            ],
          });
        })
        .then((sendee) => {
          // check if sendee was foubd
          if (!sendee) {
            throw new Error("no user found");
          }
          //check if user is anonymous and execute appropriate code
          if (sendee.anonyString.toString() === receiver.toString()) {
            let friends = sendee.anonyChats;
            friends = friends.map((chats) => {
              if (chats.chatId.toString() === userId.toString()) {
                chats.lastUpdate = new Date();
                /* let msgs = chats.messages;
                msgs[0]= msgID
                chats.messages = msgs;*/
                return chats;
              } else {
                return chats; //to keep all other chats
              };
            });
            return sendee.save();
          } else {
            //to be execute if user in normal mode
            let friends = sendee.chats;
            friends = friends.map((chats) => {
              if (chats.chatId.toString() === userId.toString()) {
                //add message to messages array
                chats.lastUpdate = new Date();
                /* let msgs = chats.messages;
                msgs[0] = msgID
                chats.messages = msgs;*/
                return chats;
              } else {
                return chats; //to keep all other chats
              }
            });

            return sendee.save();
          }
        })
        .catch((err) => {
          throw err;
        })
        .then((result) => {
          //inform user of new message if not in chat window
          io()
            .to(receiver)
            .emit("notify", {
              id: userId,
              name: pal.split(" ")[0],
              msg: message,
              time: time,
            });
          //in the notify emitter return the friend id

          //update ui of receipient if in chat room

          io().to(`${receiver}${userId}`).emit("chatMsg", {
            message: message,
            time: time,
          });
          res.json({
            code: 200,
            message: "sent sucessfully",
          });
        });
    })
    .catch((err) => {
      console.log(err);
    });
};
module.exports.removeAChat = (req, res, next) => {
  let myChats;
  const uid = req.body.uid;
  let userId;
  User.findById(req.session.user._id)
    .select(" isAnonymous chats anonyChats _id anonyString")
    .then(async (user) => {
      if (user.isAnonymous) {
        myChats = user.anonyChats;
        userId = user.anonyString;
      } else {
        myChats = user.chats;
        userId = user._id;
      };
      //filter out unwanted user from chat list
      const filteredList = myChats.filter(
        (chat) => chat.chatId.toString() !== uid.toString()
      );
      if (user.isAnonymous) {
        user.anonyChats = filteredList;
        Message.find({
          $or: [
            {
              $and: [
                { sender: uid },
                { receiver: userId },
                { count: { $gt: 0 } },
              ],
            },
            {
              $and: [
                { sender: userId },
                { receiver: uid },
                { count: { $gt: 0 } },
              ],
            },
          ],
        })
          .select("imageId")
          .then((ids) => {
            if(ids.length > 0){
            const deleteImage = require("../utils/driveUpload")
              .driveUploadDelete;
            ids.forEach((id) => {
              deleteImage(id.imageId);
            });
          }
            return Message.deleteMany({
              $or: [
                {
                  $and: [
                    { sender: uid },
                    { receiver: userId },
                    { count: { $gt: 0 } },
                  ],
                },
                {
                  $and: [
                    { sender: userId },
                    { receiver: uid },
                    { count: { $gt: 0 } },
                  ],
                },
              ],
            });
          })
          .then(async (result) => {
            if (result.n > 0) {
              return user.save()    
              .then((user) => {
                console.log("user is ", user);
                //take user to profile page after execution
                req.session.user = user;
                return req.session.save(() => {
                  res.redirect(`/profile/${user._id}`);
                });
              });
            } else {
              return Message.updateMany(
                {
                  $or: [
                    { $and: [{ sender: uid }, { receiver: userId }] },
                    { $and: [{ sender: userId }, { receiver: uid }] },
                  ],
                },
                { $set: { count: 1 } }
              ).then((_) => {
                 user.save().then((user) => {
                  console.log("user is ", user);
                  //take user to profile page after execution
                  req.session.user = user;
                  return req.session.save(() => {
                    res.redirect(`/profile/${user._id}`);
                  });
                });
              });
            }
          });
      } else {
        user.chats = filteredList;
        Message.find({
          $or: [
            {
              $and: [
                { sender: uid },
                { receiver: userId },
                { count: { $gt: 0 } },
              ],
            },
            {
              $and: [
                { sender: userId },
                { receiver: uid },
                { count: { $gt: 0 } },
              ],
            },
          ],
        })
          .select("imageId")
          .then((ids) => {
            const deleteImage = require("../utils/driveUpload")
              .driveUploadDelete;
            ids.forEach((id) => {
              deleteImage(id.imageId);
            });
            return Message.deleteMany({
              $or: [
                {
                  $and: [
                    { sender: uid },
                    { receiver: userId },
                    { count: { $gt: 0 } },
                  ],
                },
                {
                  $and: [
                    { sender: userId },
                    { receiver: uid },
                    { count: { $gt: 0 } },
                  ],
                },
              ],
            });
          })
          .then(async (result) => {
            if (result.n > 0) {
              return user.save()
              .then((user) => {
                console.log("user is ", user);
                //take user to profile page after execution
                req.session.user = user;
                return req.session.save(() => {
                  res.redirect(`/profile/${user._id}`);
                });
              });
            } else {
               Message.updateMany(
                {
                  $or: [
                    {
                      $and: [{ sender: uid }, { receiver: userId }],
                    },
                    {
                      $and: [{ sender: userId }, { receiver: uid }],
                    },
                  ],
                },
                { $set: { count: 1 } }
              ).then((_) => {
               user.save().then((user) => {
                console.log("user is ", user);
                //take user to profile page after execution
                req.session.user = user;
                return req.session.save(() => {
                  res.redirect(`/profile/${user._id}`);
                });
              });
              });
            };
          });
      };
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.deleteAccount = (req, res, next) => {
  const id = req.params.id;
  const deleteImage = require("../utils/driveUpload").driveUploadDelete;
  User.findOne({ $or: [{ _id: id }, { anonyString: id }] })
    .then((user) => {
      if (!user) {
        throw new Error("invalid id");
      }
      const oid = user.images.open.id;
      const aid = user.images.anonymous.id;
      if (oid.length > 0) deleteImage(oid);
      if (aid.length > 0) deleteImage(aid);
      const ids = user.chats.map((users) => {
        return users.chatId;
      });
      return User.find({ _id: { $in: ids } });
    })
    .catch((err) => {
      if (err.message === "invalid id") {
        return;
      }
    })
    .then((chat) => {
      chat.forEach((chats) => {
        chats.chats.filter(
          (id) => id.toString() !== req.session.user._id.toString()
        );
        chats.chats.filter(
          (id) => id.toString() !== req.session.user.anonyString.toString()
        );
        chats.anonyChats.filter(
          (id) => id.toString() !== req.session.user._id.toString()
        );
        chats.save();
      });
      return Feed.deleteMany({ user: req.session.user.share });
    })
    .then((_) => {
      Message.deleteMany({
        sender: { $in: [req.session.user._id, req.session.user.anonyString] },
      }).then((_) => {
        return Message.deleteMany({
          receiver: {
            $in: [req.session.user._id, req.session.user.anonyString],
          },
        });
      });
    })
    .then((_) => {
      return User.findByIdAndDelete(id);
    })
    .then((_) => {
      req.session.destroy(() => {
        res.clearCookie("sumo.toks");
        res.clearCookie("_csrf");
        res.redirect("/getstarted");
      });
    })
    .catch((err) => {});
};
module.exports.logout = (req, res, next) => {
  //destroy users session
  res.clearCookie("_csrf");
  req.session.destroy((err) => {
    res.clearCookie("sumo.toks");
    res.redirect("/getstarted");
  });
};
module.exports.getResetPassword = (req, res, next) => {
  const noUserFound = req.flash("noUser");
  const success = req.flash("success");
  res.render("reset", {
    noUser: noUserFound,
    success: success,
    message: noUserFound.length > 0 ? noUserFound[0].message : "",
  });
};
module.exports.reset = (req, res, next) => {
  const email = req.body.email;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        // tell user details is incorrect
        req.flash("noUser", { message: "invalid credentials" });
        return req.session.save(() => {
          res.redirect("/resetpassword");
        });
      }
      //verify user phone
      if (user.email !== email) {
        //tell user email is invalid
        req.flash("noUser", { message: "invalid email" });
        return req.session.save(() => {
          return res.redirect("/resetpassword");
        });
      }
      //generate reset token if all goes well
      crypto.randomBytes(24, (err, buffer) => {
        const token = buffer.toString("hex");
        //save token to users records
        user.resetToken = token;
        //a timestamp to it
        user.tokenMaxAge = Date.now() + 1000 * 60 * 5;
        user.save((_) => {
          //send the link to user's email
          mailer.mailer(req, res, user.email, user.name, token);
        });
      });
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.getSetNewPassword = (req, res, next) => {
  //get the token
  const token = req.params.token;
  //validate the token
  User.findOne({ resetToken: token })
    .then((user) => {
      if (!user) {
        // send an invalid token message
        //to the password reset home
        req.flash("noUser", { message: "invalid token" });
        return req.session.save(() => {
          res.redirect("/resetpassword");
        });
      }
      //check if the token has expired
      if (user.tokenMaxAge < Date.now()) {
        //send a message telling user the token has expired
        req.flash("noUser", { message: "token already expired" });
        return req.session.save(() => {
          return res.redirect("/resetpassword");
        });
      }
      //if all goes well render the set new page
      const noUserFound = req.flash("noUser");
      const message = noUserFound.length > 0 ? noUserFound[0].message : "";
      res.render("setNew.ejs", {
        noUser: noUserFound,
        success: [],
        message: message,
        token: token,
      });
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.setNewPassword = (req, res, next) => {
  //retrieve the token from the link
  const token = req.body.token;
  const password = req.body.pwd;
  const confirmPassword = req.body.cpwd;
  //validate the password if its empty
  //use the token to get the user
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    //reformat the errors if any
    req.flash("noUser", { message: errors.errors[0].msg });
    return req.session.save(() => {
      res.redirect(`/setnewpassword/${token}`);
    });
    //store error in flash which will be retrieved
    //in the get route
    /*  req.flash('erros', err);
      return req.session.save(()=>{
       res.redirect('/getstarted')
      })*/
  }
  User.findOne({ resetToken: token })
    .then((user) => {
      if (!user) {
        // tell user token is invalid
        req.flash("noUser", { message: "invalid token" });
        return req.session.save(() => {
          res.redirect("/resetpassword");
        });
      };
      //check if token is expired
      if (user.tokenTime < Date.now()) {
        //tell user token has expired
        req.flash("noUser", { message: "token already expired" });
        return req.session.save(() => {
          return res.redirect("/resetpassword");
        });
      };
      if (password !== confirmPassword) {
        //tell user the password does not match
        req.flash("noUser", { message: "passwords do not match" });
        return req.session.save(() => {
          return res.redirect(`/setnewpassword/${token}`);
        });
      };
      //hash the new pass word
      bcrypt
        .hash(password, 12)
        .then((hash) => {
          user.password = hash;
          user.resetToken = "";
          user.tokenMaxAge = "";
          return user.save();
        })
        .then((user) => {
          //tell user they can now login
          req.flash("success", true);
          return req.session.save(() => {
            res.redirect("/getstarted");
          });
        });
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.retrieveMoreChats = (req, res, next) => {
  const chatPaginator = require("../helpers/paginators").chatPaginator;
  chatPaginator(req, res, next);
};
module.exports.retrieveFeed = (req, res, next) => {
  const feedLoader = require("../helpers/paginators").loadFeeds;
  feedLoader(req, res, next);
};
module.exports.retrieveChats = (req, res, next) => {
  User.findById(req.session.user._id)
    .select("isAnonymous")
    .then((user) => {
      if (user.isAnonymous) {
        const chatLoader = require("../helpers/paginators")
          .loadChatsForAnonymousUser;
        return chatLoader(req, res, next);
      }
      const chatLoader = require("../helpers/paginators").loadChats;
      chatLoader(req, res, next);
    });
};
module.exports.retrieveProfileChats = (req, res, next) => {
  User.findById(req.session.user._id)
    .select("isAnonymous")
    .then((user) => {
      if (user.isAnonymous) {
        const chatsLoader = require("../helpers/paginators")
          .loadChatsForAnonymousProfile;
        return chatsLoader(req, res, next);
      }
      const chatsLoader = require("../helpers/paginators").loadChatsInProfile;
      chatsLoader(req, res, next);
    });
};
module.exports.searchUser = (req, res, next) => {
  User.findById(req.session.user._id)
    .select("isAnonymous anonyString _id")
    .then((user) => {
      if (!user) return res.json("");
      const searchName = req.body.searchKey.toLowerCase().trim();
      const userId = user.isAnonymous ? user.anonyString : user._id;
      const regex = new RegExp(searchName, "i");
      if(searchName.length <= 0 ){
        return res.json({
          message:'input is empty',
        })
      }
      User.find({ name: { $regex: regex } })
        .select("_id name chats chatShare desc images")
        .then((users) => {
          if (users.length <= 0) {
            throw new Error("no user found");
          }
          const result = users.map((user) => {
            const isFriend = user.chats.some(
              (chat) => chat.chatId.toString() === userId.toString()
            );
            const isMe = user._id.toString() === userId.toString();
            if (isFriend) {
              return {
                name: user.name,
                desc: user.desc,
                id: user._id,
                chatId: user.chatShare,
                img: user.images.open.link,
                pals: true,
              };
            }
            if (isMe) {
            } else {
              return {
                name: user.name,
                desc: user.desc,
                id: user._id,
                img: user.images.open.link,
                chatId: user.chatShare,
                pals: false,
              };
            }
          });
          res.json({
            code: 200,
            result: result,
          });
        })
        .catch((err) => {
          if (err.message === "no user found") {
            res.json({
              code: 400,
              message: "no user was found",
            });
          }
        });
    });
};
