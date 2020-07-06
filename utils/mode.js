const User = require("../models/user");
const Message = require("../models/messages");
const detectors = require("../utils/detectors");
const validator = require('validator');
module.exports.anonymousUserMode = (req, res, next, io) => {
  let page = +req.query.page || 1;
  //reformat this line later
  User.findOne({ _id: req.session.user._id })
    .select("anonymousName _id email anonyChats anonyString images isAnonymous")
    .then((me) => {
      //retrieve all user id the current user has discussed with anonymously
      const chatids = me.anonyChats.map((id) => {
        return id.chatId;
      });
      //online user will be docs of the with the specified ids
      // get the underlying socket connection
      const feedRoom = io();
      //set listener for a possible socket connection
      feedRoom.once("connect", (socket) => {
        //once a socket is connected it joins a room
        //based on the user's id
        socket.join("userChannels");
        socket.join(me.anonyString);
        //set users anonymous status to online
        detectors.goOnline(me.anonyString, socket);
        socket.on("identify", (id) => {
          //iterate through the ids and emit the online event
          //to the rooms of our individual chats
          chatids.forEach((element) => {
            /*socket.broadcast.to(element).emit("online", {
              name: me.anonymousName,
              fid: id,
              img: me.images.anonymous.thumbnail,
            });*/
          });
          //socket.broadcast.emit("online", { name: '6anonymous', fid: id, })
          //  socket.emit("activeUsers", onlineUser);
        });
        socket.on("disconnect", () => {
          socket.broadcast.emit("left", me._id);
          //trigger an offline timer as soon as the user disconnects from socket layer
          detectors.goOffline(me.anonyString, socket);
          socket.disconnect(true);
        });
      });
      //render view with necesary data
      req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :'';
      const inform = req.flash("inform");
      res.render("feed", {
        name: me.anonymousName,
        email: me.email,
        img: me.images.anonymous.link,
        uid: me._id,
        inform: inform.length > 0 ? inform[0] : { status: false, msg: "" },
        hasNext: false, //5 * page < nAnonyChats,
        hasPrev: false,
        next: 1,
        prev: page - 1,
        onlineUsers: [], //filteredUsersList,
        anonymous: me.isAnonymous ? true : false,
      });
    });
};

// logic for anonymous chat mode
module.exports.anonymousChatMode = (req, res, next, io) => {
  //load messages from db for the given user
  const id = req.params.chatId;
  let friend;
  let status;
  let me;
  let thumbnail;
  //fetch chats on loading
  User.findById(req.session.user._id)
  .then(user => {
      me = user;
       return Message.updateMany(
        {$and: [{receiver: user.anonyString,sender:id}] },
        { $set: { isMsgNew: false }})
    })
    .catch(err=>{
        console.log(err);
    })
    .then(_=>{
        return;
    })
    .then((_) => {
      //find the user we want to chat with from db if the users mode is not anonymous
      User.findById(id)
        .then((myf) => {
          //get their names and status
          if (myf) {
            const onList = myf.chats.some(
              (chat) =>
                chat.chatId.toString() ===
                req.session.user.anonyString.toString()
            );
            friend = myf.name;
            status = onList ? myf.status : "removed";
            thumbnail = myf.images.open.thumbnail;
            img = myf.images.open.link;
            return null;
          } else {
            //redundant remember to remove
            return User.findOne({ anonyString: id }); //search for the user if they are actually anonymous
          };
        })
        .then((myf) => {
          if (myf) {
            //a bit redundant remove later
            //set to their anonymous name later
            const onList = myf.chats.some(
              (chat) =>
                chat.chatId.toString() ===
                req.session.user.anonyString.toString()
            );
            friend = myf.anonymousName;
            img = myf.images.anonymous.link;
            thumbnail = myf.images.anonymous.thumbnail;
            status = onList ? myf.anonymousStatus : "removed you";
          }
          //set up socket connection listener
          io().once("connect", (socket) => {
            //set up online trigger
            detectors.goOnline(req.session.user.anonyString, socket);
            socket.on("disconnect", () => {
              //set up offline trigger
              detectors.goOffline(req.session.user.anonyString, socket);
            });
            //join a room with the user token and the chat id
            //this is meant to ensure uniqueness when broadcasting
            socket.join(`${req.session.user.anonyString}${id}`); //add anonychatstring
            //listener for marking all new messages as old
            socket.on("typing", (friendId) => {
              io()
                .to(`${friendId}${req.session.user.anonyString}`)
                .emit("isTyping");
            });
            socket.on("stopTyping", (friendId) => {
              io()
                .to(`${friendId}${req.session.user.anonyString}`)
                .emit("stoppedTyping");
            });
            socket.on("receive", () => {
              //set all isNew field in the mesage
              //to false
              Message.updateMany(
                {$and:[ {receiver: me.anonyString},{sender:id}] },
                { $set: { isMsgNew: false } }
              ).then((_) => {});
            });
          });
          req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :''
          res.render("chatPage", {
            fid: id,
            uid: req.session.user.anonyString,
            img: img,
            thumbnail:thumbnail,
            friend: friend,
            status: status,
            anonymous:me.isAnonymous ? true : false,
          });
        })
        .catch((err) => {
          next(err);
        });
    });
};
//logic for normal user mode
module.exports.normalUserMode = (req, res, next, io) => {
  let me;
  let chatids;
  let OpenChats;
  let AnonyChats;
  User.findOne({ _id: req.session.user._id })
    .select("name email chats _id images")
    .populate("chats.messages")
    .then((user) => {
      me = user;
      //extract all chat ids in user chats array
      let chatid = user.chats.map((id) => {
        return id.chatId;
      });
      chatids = chatid;
      //get a count of the total chats user has
      return User.find({ _id: { $in: chatids } });
    })
    .then((openChats) => {
      //online user will be docs of the with the specified ids
      OpenChats = openChats;
      //get a count of the total anonymous chats user has
      return User.find({ anonyString: { $in: chatids } }).countDocuments();
    })
    .then((anonychats) => {
      AnonyChats = anonychats.length > 0 ? [...anonychats] : [];
      const feedRoom = io();
      feedRoom.once("connect", (socket) => {
        detectors.goOnline(me._id, socket);
        //once a socket is connected it joins a room
        //which is formed by thr user id
        socket.join(me._id); //user joins a specific room via their id
        //listener to inform chats user is online
        socket.on("identify", (id) => {
          //query db for user returning only the chats field
          //we iterate through the ids and emit the online event
          //to the rooms of our individual users
          const stillInChat = [...OpenChats, ...AnonyChats].map((active) => {
            const inOpenChat = active.chats.some(
              (id) => id.chatId === req.session.user._id
            );
            const inClosedChat = active.anonyChats.some(
              (id) => id.chatId === req.session.user._id
            );
            if (inOpenChat) {
              return active._id;
            } else if (inClosedChat) {
              return active.anonyString;
            };
          });
          /*chatids*/ stillInChat.forEach((element) => {
            socket.broadcast.to(element).emit("online", {
              name: me.name,
              fid: id,
              img: me.images.open.thumbnail,
            });
          });
        });
        socket.on("disconnect", () => {
          //  socket.broadcast.emit("left", me._id);
          detectors.goOffline(me._id, socket);
          socket.disconnect(true);
        });
      });
      req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :'';
      const inform = req.flash("inform");

      res.render("feed", {
        name: me.name,
        email: me.email,
        feed: me.feeds,
        img: me.images.open.thumbnail,
        sharelink: me.share,
        uid: me._id,
        chat: me.chatShare,
        inform: inform.length > 0 ? inform[0] : { status: false, msg: "" },
        onlineUsers: [], //filteredUsersList,//onlineUser.concat(anonymous)
        anonymous: me.isAnonymous ? true : false,
      });
    }); //end
};

//normal chat mode
module.exports.normalChatMode = (req, res, next, io) => {
  const id = req.params.chatId;
  let friend;
  let status;
  let anStatus;
  let user;
  let thumbnail
  User.findById(req.session.user._id)
    .then((me) => {
      user = me;
      return Message.updateMany(
        {$and:[{sender:id},{receiver:req.session.user._id}] },
        { $set: { isMsgNew: false } }
      ).then((_) => {
        return;
      });
    })
    .catch((er) => {
      throw err;
    })
    .then((_) => {
      User.findById(id)
        .then((myf) => {
          //myf === myfriend
          if (myf) {
            //get friend name and online status if in normal mode
            const onList = myf.chats.some(
              (chat) =>chat.chatId.toString() === user._id.toString()
            );

            friend = myf.name;
            status = onList ? myf.status : "removed you";
            img = myf.images.open.link;
            thumbnail = myf.images.open.thumbnail;

            return null;
          } else {
            return User.findOne({ anonyString: id });
          };
        })
        .then((myf) => {
          if (myf) {
            //get anonymous name and online status
            const onList = myf.anonyChats.some((chat) =>chat.chatId.toString() === req.session.user._id.toString());
            friend = myf.anonymousName;
            status = onList ? myf.anonymousStatus : "removed you";
            img = myf.images.anonymous.link;
            thumbnail = myf.images.anonymous.thumbnail;
          };
          io().once("connect", (socket) => {
            //online trigger
            detectors.goOnline(req.session.user._id, socket);
            socket.on("disconnect", () => {
              //offline trigger
              detectors.goOffline(req.session.user._id, socket);
            });
            //user joins room corresponding to their id and that of the chats
            //this to maintain uniqueness
            socket.join(`${req.session.user._id}${id}`);
            socket.on("typing", (friendId) => {
              io().to(`${friendId}${req.session.user._id}`).emit("isTyping");
            });
            socket.on("stopTyping", (friendId) => {
              io()
                .to(`${friendId}${req.session.user._id}`)
                .emit("stoppedTyping");
            });
            socket.on("receive", () => {
              //set all isNew field in the mesage
              //to false if user reads message immediately
              Message.updateMany(
                {$and:[{sender:id},{receiver:req.session.user._id}]},
                { $set: { isMsgNew: false } }
              ).then((_) => {});
            });
          });
          req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :'';
 
          res.render("chatPage", {
            fid: id,
            uid: req.session.user._id,
            friend: friend,
            status: status,
            img: img,
            thumbnail:thumbnail,
            anStatus: anStatus,
            anonymous: req.session.user.isAnonymous ? true : false,
          });
        });
    });
};

module.exports.mainMenu = (req,res,next,io) =>{
  let me
  User.findOne({ _id: req.session.user._id })
  .then((user) => {
    me= user
    //const feedRoom = io();
      io().once("connect", (socket) => {
        detectors.goOnline(me._id, socket);
        socket.join(me._id);
        //profile sockets
       // detectors.goOnline(user._id, socket);
        //listener for user who wants to change
        //their display name
        socket.on("newname", (data, fn) => {
          const name = validator.escape(data)
          if (!data) return;
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { name: name.substring(0,30) } }
          )
            .then((u) => {
              req.session.user.name = name;
              req.session.save(() => {
                fn();
              });
            })
            .catch((err) => {
              throw err;
            });
        });
        socket.on("newdesc", (data, fn) => {
          const desc = validator.escape(data)
          if (!data) return; //kill execution if no data
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { desc: desc.substring(0,200) } }
          )
            .then((u) => {
              req.session.user.desc = desc;
              req.session.save(() => {
                fn();
              });
            })
            .catch((err) => {
              throw err;
            });
        });
        socket.on("newanonymous", (data, fn) => {
          if (!data) return; //kill execution
          let a = validator.escape(data)
          a = a.substring(0,30);
          User.updateOne(
            { _id: req.session.user._id },
            { $set: { anonymousName: a } }
          )
            .then((u) => {
              req.session.user.anonymousName = a;
              req.session.save(() => {
                fn();
              });
            })
            .catch((err) => {
              next(err);
            });
        });
        //end of profile sockets
        socket.on("disconnect", () => {
          detectors.goOffline(me._id, socket);
          socket.disconnect(true);
        });
      });
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
      res.render("sumo-view", {
        user: user,
        total:me.chats.length + me.anonyChats.length,
        name:user.name,
        email: user.email,
        feed: user.feeds,
        view:me.images.open.link,
        img: me.images.open.thumbnail,
        sharelink: user.share,
        uid: user._id,
        chat: user.chatShare,
        chats: [],
        anonymous: user.isAnonymous ? true : false,
        errors: errors ? errors : { field: "", message: "" },
        success: success ? success : { message: "" },
      });
    })
}
module.exports.goAnoymousMode = (req,res,next,io)=>{
  User.findOne({ _id: req.session.user._id })  
  .then((me) => {

    //set listener for a possible socket connection
    io().once("connect", (socket) => {
      socket.join(me.anonyString);
      detectors.goOnline(me.anonyString, socket);
      
      socket.on("disconnect", () => {
        socket.broadcast.emit("left", me._id);
        detectors.goOffline(me.anonyString, socket);
      });
    });
    const error = req.flash('error');
    const succes = req.flash('success');
    let errors;
    let success;
    if (error.length > 0) {
      errors = error[0];
    };
    if (succes.length > 0) {
      success = succes[0];
    };
    req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :'';
    const inform = req.flash("inform");
    res.render("sumo-view", {
      user: me, 
      total:me.anonyChats.length,         
      errors: errors ? errors : { field: '', message: '' },
      success: success ? success : { message: '' },
      name: me.anonymousName,
      chat: me.chatShare,
      email: me.email,
      sharelink: me.share,
      img: me.images.anonymous.thumbnail,
      view:me.images.anonymous.link,
      uid: me.anonyString,
      inform: inform.length > 0 ? inform[0] : { status: false, msg: "" },//filteredUsersList,
      anonymous: me.isAnonymous ? true : false,
    });
  })
}
