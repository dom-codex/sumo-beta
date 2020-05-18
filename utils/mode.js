const User = require("../models/user");
const detectors = require('../utils/detectors')
module.exports.anonymousUserMode = (req, res, next, io) => {
    let page = +req.query.page || 1;
    let nAnonyChats;
    let me;
    let chatids = []
    User.findOne({ _id: req.session.user._id })
    //find associated user with the session
        .then((user) => {
            me = user;
            //retrieve all user id the current user has discussed with anonymously
            chatids = user.anonyChats.map((id) => {
                return id.chatId;
            });
            //query db for the number of users they are chatting with anonymously
            return User.find({ _id: { $in: chatids } }).countDocuments()
        })
        .then(n => {
            //initialize with the number received
            nAnonyChats = n
            //get actual details of users we are chatting with anonymously but limiting
            //the result by a chosen preference
            return User.find({ _id: { $in: chatids } }).skip((page - 1) * 2)
                .limit(2)
        }).then((onlineUser) => {
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
                detectors.goOnline(me.anonyString, socket)
                socket.on("identify", (id) => {
                    //iterate through the ids and emit the online event
                    //to the rooms of our individual chats
                    chatids.forEach((element) => {
                        socket.broadcast
                            .to(element)
                            .emit("online", { name: "1anonymous", fid: id });
                    });
                    //socket.broadcast.emit("online", { name: '6anonymous', fid: id, })
                    //  socket.emit("activeUsers", onlineUser);
                });
                //join  chat listener
                socket.on("joinChat", (data, fn) => {
                    let uid;
                    let newChat; //variable to hold the user details
                    //who we want to chat
                    const chatString = data.chatString; //retrieve the chat string of user who we want to chat with
                    //query DB to see if the chatstring exists
                    User.findOne({ chatShare: chatString })
                        .then((user) => {
                            //check if we are trying to add ourselves
                            if (user._id.toString() === req.session.user._id.toString() || user.anonyString === req.session.user.anonyString.toString()) {
                                //tell user they cant add themselves
                                throw new Error('you cannot add yourself')
                            } else {
                                newChat = user; //intialize variable with owner of chat string
                                //i.e user we want to chat with
                                const chats = user.chats; //initialize variable with the chats array of user we want to chat with
                                //we push in the anonymous token of the user requesting to chat array of the open user
                                chats.push({
                                    chatId: req.session.user.anonyString,
                                    messages: [],
                                });
                                uid = user._id;
                                user.chats = chats; // set the chats array of the user we want
                                //to chat with to the updated chats array of the user we want to chat with
                                return user.save();
                            }
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((_) => {
                            //retrieve anonymous user details from the db
                            return User.findById(req.session.user._id);
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((user) => {
                            //update chat requestee anonychat field with the id of
                            //the user we want to chat with
                            me = user;
                            const chats = user.anonyChats;
                            chats.push({
                                chatId: uid,
                                messages: [],
                            });
                            return user.save(); //save the updates to the db
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((_) => {
                            //call the callback function passed when requestee
                            //trys to join a chat with the details of the
                            //requested chat
                            //fn(newChat);
                            //inform the user who we want to chat with
                            //that we have joined their chat thus
                            //their ui can be updated accordingly
                            socket.broadcast.to(newChat._id).emit("online", {
                                name: me.anonymousName,
                                fid: req.session.user.anonyString, 
                                anStatus:me.anonymousStatus
                            });
                            fn(newChat); //function to update the user ui requestion to join a chat
                        })
                        .catch((err) => {
                            next(err);
                        });
                });
                //end of join chat
                socket.on("disconnect", () => {
                    socket.broadcast.emit("left", me._id);
                    //trigger an offline timer as soon as the user disconnects from socket layer
                    detectors.goOffline(me.anonyString,socket)
                    socket.disconnect(true);
                });
            });
            //iterate through the chat list of the resulting users we are chatting with anonymously
            const reformedChatList = onlineUser.map(aUser => {
                //retrieve particular element from user chats where the chatid in user chats matches with their id
                const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === aUser._id.toString())
                // const myChatsWithUser = aUser.chats.find(chat => chat.chatId.toString() === req.session.user.anonyString.toString())
                //format the result of this queries
                return {
                    name: aUser.name,
                    _id: aUser._id,
                    status:aUser.status,
                    isNew:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew : false,
                    message:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body : 'say hi',
                    time:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time : ''
                }
            })
            //filter array so that new messages are displayed first or online users 
            let filteredUsersList = [];
            [...reformedChatList].forEach(user => {
                if (user.isNew || user.status === 'online') {
                    filteredUsersList.unshift(user)
                } else {
                    filteredUsersList.push(user)
                }
            })
            //render view with necesary data
            res.render("feed", {
                name: me.name,
                phone: me.phone,
                feed: me.feeds,
                sharelink: me.share,
                uid: me.anonyString,
                chat: me.chatShare,
                hasNext: 2 * page < nAnonyChats,
                hasPrev: page > 1,
                next: page + 1,
                prev: page - 1,
                onlineUsers: filteredUsersList,
            });
        });
    /*
    User.find({ _id: { $in: chatids } }).then((onlineUser) => {
        //online user will be docs of the with the specified ids
        const feedRoom = io();
        feedRoom.once("connect", (socket) => {
            console.log('im anonymous')
            //once a socket is connected it joins a room
            //which is formed by thr user id
            socket.join("userChannels");
            socket.join(user.anonyString);
            socket.on("identify", (id) => {
                //query db for user returning only the chats field
                //we iterate through the ids and emit the online event
                //to the rooms of our individual users
                chatids.forEach((element) => {
                    //add the anonychatstring later and pass to fid
                    socket.broadcast
                        .to(element)
                        .emit("online", { name: "anonymous", fid: id });
                });
                socket.broadcast.emit("online", { name: 'anonymous', fid: id, })
                //  socket.emit("activeUsers", onlineUser);
            });
            //join  chat listener
            socket.on("joinChat", (data, fn) => {
                let uid;
                let newChat; //variable to hold the user details
                //who we want to chat
                const chatString = data.chatString; //retrieve the chat string
                //query DB to see if the chatstring exists
                User.findOne({ chatShare: chatString })
                    .then((user) => {
                        if (user._id.toString() === req.session.user._id.toString()) {
                            //tell user they cant add themselves
                        }
                        newChat = user; //intialize variable with owner of chat string
                        const chats = user.chats; //initialize variable with the chats array of user
                        chats.push({
                            //add the anonystring later
                            chatId: req.session.user.anonyString,
                            messages: [],
                        }); //add the id of the user requesting to join a chat to the chats array
                        uid = user._id;
                        user.chats = chats;
                        return user.save();
                    })
                    .catch((err) => {
                        throw err;
                    })
                    .then((_) => {
                        //retrieve our own details on the db
                        return User.findById(req.session.user._id);
                    })
                    .catch((err) => {
                        throw err;
                    })
                    .then((user) => {
                        //update chat requestee anonychat field with the id of
                        //the user we want to chat with
                        const chats = user.anonyChats;
                        chats.push({
                            chatId: uid,
                            messages: [],
                        });
                        return user.save();
                    })
                    .catch((err) => {
                        throw err;
                    })
                    .then((_) => {
                        //call the callback function passed when requestee
                        //trys to join a chat with the details of the
                        //requested chat
                        //fn(newChat);
                        //inform the user who we want to chat with
                        //that we have joined their chat thus
                        //their ui can be updated accordingly
                        socket.broadcast.to(newChat._id).emit("online", {
                            name: "anonymous",
                            fid: req.session.user.anonyString, //add the anonystring later
                        });
                        fn(newChat);
                    })
                    .catch((err) => {
                        next(err);
                    });
            });
            //end of join chat
            socket.on("disconnect", () => {
                socket.broadcast.emit("left", user._id);

                socket.disconnect(true);
            });
        });
        const reformedChatList = onlineUser.map(aUser => {
            const myChatsWithUser = aUser.chats.find(chat => chat.chatId.toString() === req.session.user.anonyString.toString())
            return {
                name: aUser.name,
                _id: aUser._id,
                message: myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body,
                isNew: myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew,
                time: myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time
            }
        })
        //filter array so that new messages are displayed first
        let filteredUsersList = [];
        [...reformedChatList].forEach(user => {
            if (user.isNew) {
                filteredUsersList.unshift(user)
            } else {
                filteredUsersList.push(user)
            }
        })
        res.render("feed", {
            name: user.name,
            feed: user.feeds,
            sharelink: user.share,
            uid: user.anonyString,
            chat: user.chatShare,
            onlineUsers:filteredUsersList,
        });
    });
    //ending of first then
}); */
};

// logic for anonymous chat mode
module.exports.anonymousChatMode = (req, res, next, io) => {
    //load messages from db for the given user
    const id = req.params.chatId;
    let friend;
    let status;
    //fetch chats on loading
    User.findById(req.session.user._id)
        .then((me) => {
        //retrieve the index of the user docs who we want to chat with in current chats array whose id matches the chat id in our chats array
            const index = me.chats.findIndex(member => member.chatId.toString() === id.toString)
            //retrieve the actual document
            let chatUser = me.chats.find(chat => chat.chatId.toString() === id.toString())
           //retrieve the messages
            let messagesWithUser = chatUser.messages//me.chats.find(chat => chat.chatId.toString() === id.toString()).messages
             //check for new messages and mark them as read
            messagesWithUser = messagesWithUser.map(msg => {
                if (msg.isMsgNew === true) {
                    msg.isMsgNew = false
                    return msg
                } else return msg
            })
            //update the message field of the user in the current user chats to the updated messages array
            chatUser.messages = messagesWithUser;
            //update the field overall docs of the user we want to chat with in the current user chats
            me.chats[index] = chatUser;
            me.save() //we won't wait for the promise to finish as this is meant to only mark unread messages as read
            const mychats = me.anonyChats;
           //retriev docs of user we want to chat with from our chats array
            const pal = mychats.find(
                (chats) => chats.chatId.toString() === id.toString()
            );
            const palmsgs = pal.messages; //get our messages with them
            return palmsgs
        })
        .catch((err) => {
            throw err;
        })
        .then((msgs) => {
            //find the user we want to chat with from db if the users mode is not anonymous
            User.findById(id).
            then(myf => {
                //get their names and status
                if (myf) {
                    friend = myf.name;
                    status = myf.status;
                    return null
                } else {
                    return User.findOne({ anonyString: id }) //search for the user if they are actually anonymous
                }
            }).then(myf => {
                if (myf) {
                    //set to their anonymous name later
                    friend = 'anonymous'
                    status = myf.anonymousStatus
                }
            //set up socket connection listener
            io().once("connect", (socket) => {
              //  socket.join(req.session.user.anonyString); //add anonychatstring
            //set up online trigger
              detectors.goOnline(req.session.user.anonyString,socket)
              socket.on('disconnect',()=>{
                  //set up offline trigger
                  detectors.goOffline(req.session.user.anonyString,socket)
              })  
              //join a room with the user token and the chat id  
              //this is meant to ensure uniqueness when broadcasting
              socket.join(`${req.session.user.anonyString}${id}`); //add anonychatstring
                socket.on('receive', () => {
                    //set all isNew field in the mesage
                    //to false
                    User.findById(req.session.user._id)
                        .then(user => {
                            let messagesWithUser = user.anonyChats.find(chat => chat.chatId === id).messages

                            messagesWithUser = messagesWithUser.map(msg => {
                                if (msg.isNew === true) {
                                    msg.isNew = false
                                    return msg
                                } else return msg
                            })
                            user.save()
                        })
                })
                //chat listener
                socket.on("chat", (data, fns) => {
                    //save message to db

                    User.findById(req.session.user._id)
                        .then((user) => {
                            //retrive the chats array from senders details
                            let friends = user.anonyChats;
                            friends = friends.map((chats) => {
                                if (chats.chatId.toString() === data.fid.toString()) {
                                    //add message to messages array
                                    console.log("saving messages1");
                                    let msgs = chats.messages;
                                    msgs.push({
                                        sender: req.session.user._id,
                                        receiver: id,
                                        body: data.message,
                                        time: data.time
                                    });
                                    chats.messages = msgs;
                                    return chats;
                                } else {
                                    return chats; //to keep all other chats
                                }
                            });
                            user.anonyChats = friends;
                            return user.save();
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((_) => {
                            return User.findById(data.fid);
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((sendee) => {
                            let friends = sendee.chats;
                            friends = friends.map((chats) => {
                                if (
                                    //check for the anonymous string instead of user id
                                    chats.chatId.toString() === req.session.user.anonyString.toString()
                                ) {
                                    //add message to messages array
                                    console.log("saving messages");
                                    let msgs = chats.messages;
                                    msgs.push({
                                        sender: req.session.user.anonyString,
                                        receiver: id,
                                        body: data.message,
                                        isMsgNew: true,
                                        time: data.time
                                    });
                                    chats.messages = msgs;
                                    return chats;
                                } else {
                                    return chats; //to keep all other chats
                                }
                            });
                            return sendee.save();
                        })
                        .catch((err) => {
                            throw err;
                        })
                        .then((result) => {
                            socket.broadcast
                                .to(id)
                                .emit("notify", { time: data.time, msg: data.message, id: req.session.user.anonyString });
                            //in the notify emitter return the friend id

                            //update ui of receipient
                            socket.broadcast.to(`${id}${req.session.user.anonyString}`).emit("chatMsg", {
                                message: data.message,
                                time: data.time
                            });
                            fns();
                        })
                        .catch((err) => { });
                    //chat event end
                });
            });
            res.render("chatPage", { 
                fid: id, 
                meChats: msgs,
                friend:friend,
                status:status,
             });
        })
        .catch((err) => {
            next(err);
        });
    })
};
//logic for normal user mode
module.exports.normalUserMode = (req, res, next, io) => {
    const page = +req.query.page || 1
    let anonymous = []
    let me;
    let chatids;
    let nTotalOpenChats;
    let nTotalAnonyChats;
    let anonyids;
    User.findOne({ _id: req.session.user._id })
        .then((user) => {
            me = user
            const chatid = user.chats.map((id) => {
                return id.chatId;
            });
            chatids = chatid;
            return User.find({ _id: { $in: chatids } }).countDocuments()
        })
        .then((nOpenChats) => {
            //online user will be docs of the with the specified ids
            nTotalOpenChats = nOpenChats;
            return User.find({ anonyString: { $in: chatids } }).countDocuments()
        })
        .then(nAnonyusers => {
            nTotalAnonyChats = nAnonyusers
            return
        })
        .then(_ => {
            User.find({ _id: { $in: chatids } }).skip((page - 1) * 2)
                .limit(2)
                .then((onlineUser) => {
                    User.find({ anonyString: { $in: chatids } }).skip((page - 1) * 2).limit(2)
                        .then(anonyusers => {
                            if (anonyusers.length > 0) {
                                anonymous = anonyusers.map((a, i) => {
                                    const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === a.anonyString.toString())
                                    return {
                                        name: 'anonymous' + i,
                                        _id: a.anonyString,
                                        anStatus:a.anonymousStatus,
                                        message: myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body : 'hey',
                                        isNew: myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew : false,
                                        time: myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time : ''

                                    }
                                })
                            }
                            const feedRoom = io();
                            feedRoom.once("connect", (socket) => {
                                detectors.goOnline(me._id, socket)
                                 console.log('fedding')
                                //once a socket is connected it joins a room
                                //which is formed by thr user id
                                socket.join("userChannels");
                                socket.join(me._id);
                                socket.on("identify", (id) => {
                                    //query db for user returning only the chats field
                                    //we iterate through the ids and emit the online event
                                    //to the rooms of our individual users
                                    chatids.forEach((element) => {
                                        socket.broadcast
                                            .to(element)
                                            .emit("online", { name: me.name, fid: id });
                                    });
                                    // socket.broadcast.emit("online",{name:user.name,fid:id,})
                                    //   socket.emit("activeUsers", onlineUser);
                                });
                                //join  chat listener
                                socket.on("joinChat", (data, fn) => {
                                    let uid;
                                    let newChat;
                                    //variable to hold the user details
                                    //who we want to chat
                                    const chatString = data.chatString; //retrieve the chat string
                                    //query DB to see if the chatstring exists
                                    User.findOne({ chatShare: chatString })
                                        .then((user) => {
                                            if (user._id.toString() === req.session.user._id.toString() || user.anonyString === req.session.user.anonyString.toString()) {
                                                //tell user they cant add themselves
                                                throw new Error('you cannot add yourself')
                                            } else {
                                                newChat = user; //intialize variable with owner of chat string
                                                const chats = user.chats; //initialize variable with the chats array of user
                                                chats.push({
                                                    chatId: req.session.user._id,
                                                    messages: [],
                                                }); //add the id of the user requesting to join a chat to the chats array
                                                uid = user._id;
                                                user.chats = chats;
                                                return user.save();
                                            } //add else curly brace
                                        })
                                        .catch((err) => {
                                            socket.emit('denied', { message: err.message })
                                            throw new Error()
                                        })
                                        .then((_) => {
                                            //retrieve our own details on the db
                                            return User.findById(req.session.user._id);
                                        })
                                        .catch((err) => {
                                            throw err;
                                        })
                                        .then((user) => {
                                            //update chat requestees chats field with the id of
                                            //the user we want to chat with
                                            me = user;
                                            const chats = user.chats;
                                            chats.push({
                                                chatId: uid,
                                                messages: [],
                                            });
                                            return user.save();
                                        })
                                        .catch((err) => {
                                            throw err;
                                        })
                                        .then((_) => {
                                            //call the callback function passed when requestee
                                            //trys to join a chat with the details of the
                                            //requested chat
                                            //fn(newChat);
                                            //inform the user who we want to chat with
                                            //that we have joined their chat thus
                                            //their ui can be updated accordingly
                                            socket.broadcast.to(newChat._id).emit("online", {
                                                name: req.session.user.name,
                                                fid: req.session.user._id,
                                                status: 'online'
                                            
                                            });
                                            fn(newChat);
                                        })
                                        .catch((err) => {
                                            console.log('this is the')
                                        });
                                });
                                //end of join chat
                                socket.on("disconnect", () => {
                                    socket.broadcast.emit("left", me._id);
                                    detectors.goOffline(me._id, socket)
                                    socket.disconnect(true);
                                });
                            });
                            const reformedChatList = onlineUser.map(aUser => {
                                //const myChatsWithUser = aUser.chats.find(chat=>chat.chatId.toString() === req.session.user._id.toString())
                                const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === aUser._id.toString())
                                //console.log(myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew)
                                return {
                                    name: aUser.name,
                                    _id: aUser._id,
                                    status:aUser.status,
                                    isNew:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew : false,
                                    message:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body : 'say hi',
                                    time:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time : ''
                                }
                            })
                            //filter array so that new messages are displayed first
                            let filteredUsersList = [];
                            [...reformedChatList, ...anonymous].forEach(user => {
                                if (user.isNew || user.status === 'online' || user.anStatus === 'online') {
                                    filteredUsersList.unshift(user)
                                } else {
                                    filteredUsersList.push(user)
                                }
                            })
                            return res.render("feed", {
                                name: me.name,
                                phone: me.phone,
                                feed: me.feeds,
                                sharelink: me.share,
                                uid: me._id,
                                chat: me.chatShare,
                                current: page,
                                hasNext: 2 * page < nTotalAnonyChats + nTotalOpenChats,
                                hasPrev: page > 1,
                                next: page + 1,
                                prev: page - 1,
                                last: Math.ceil((nTotalOpenChats + nTotalAnonyChats) / 2),
                                onlineUsers: filteredUsersList//onlineUser.concat(anonymous)

                            });
                        })
                }) //end of anonyusers then


        })//end of overall then
};

//normal chat mode
module.exports.normalChatMode = (req, res, next, io) => {
    //load messages from db for the given user
    const id = req.params.chatId;
    let friend;
    let status;
    let anStatus;
    //fetch chats on loading

    User.findById(req.session.user._id)
        .then((me) => {
            const index = me.chats.findIndex(member => member.chatId.toString() === id.toString())
            let chatUser = me.chats.find(chat => chat.chatId.toString() == id.toString())
            console.log('this is user', chatUser)
            let messagesWithUser = chatUser.messages;
            // let messagesWithUser = me.chats.find(chat => chat.chatId.toString() === id.toString())?me.chats.find(chat => chat.chatId.toString() === id.toString()).messages : [];
            messagesWithUser = messagesWithUser.map(msg => {
                if (msg.isMsgNew === true) {
                    msg.isMsgNew = false
                    return msg
                } else return msg
            })
            chatUser.messages = messagesWithUser;
            me.chats[index] = chatUser;
            me.save()


            const mychats = me.chats;
            const pal = mychats.find(
                (chats) => chats.chatId.toString() === id.toString()
            );

            const palmsgs = pal ? pal.messages : [];
            return palmsgs
        })
        .catch((err) => {
            throw err;
        })
        .then((msgs) => {


            User.findById(id).
            then(myf => {
                if (myf) {
                    friend = myf.name;
                    status = myf.status;

                    return null
                } else {
                    return User.findOne({ anonyString: id })
                }
            }).then(myf => {
                if (myf) {
                    friend = 'anonymous';
                    status = myf.anonymousStatus;
                    
                }


                io().once("connect", (socket) => {
                    console.log("chat connect");
                  //  socket.join(req.session.user._id);
                  detectors.goOnline(req.session.user._id,socket)
                  socket.on('disconnect',()=>{
                      detectors.goOffline(req.session.user._id,socket)
                  })  
                  socket.join(`${req.session.user._id}${id}`);
                    socket.on('receive', () => {
                        //set all isNew field in the mesage
                        //to false
                        User.findById(req.session.user._id)
                            .then(user => {
                                let messagesWithUser = user.chats.find(chat => chat.chatId.toString() === id.toString()).messages

                                messagesWithUser = messagesWithUser.map(msg => {
                                    if (msg.isMsgNew === true) {
                                        msg.isMsgNew = false
                                        return msg
                                    } else return msg
                                })
                                user.save();
                            })
                    })
                    socket.on("chat", (data, fns) => {
                        //save message to db
                        User.findById(req.session.user._id)
                            .then((user) => {
                                //retrive the chats array from senders details
                                let friends = user.chats;
                                friends = friends.map((chats) => {
                                    if (chats.chatId.toString() === data.fid.toString()) {
                                        //add message to messages array
                                        console.log("saving messages1");
                                        let msgs = chats.messages;
                                        msgs.push({
                                            sender: req.session.user._id,
                                            receiver: id,
                                            body: data.message,
                                            isMsgNew: false,
                                            time: data.time
                                        });
                                        chats.messages = msgs;
                                        return chats;
                                    } else {
                                        return chats; //to keep all other chats
                                    }
                                });
                                user.chats = friends;
                                return user.save();
                            })
                            .catch((err) => {
                                throw err;
                            })
                            .then((_) => {
                                // return User.findById(data.fid.toString());
                                return User.findOne({ $or: [{ _id: data.fid }, { anonyString: data.fid }] });
                            })
                            .catch((err) => {
                                throw err;
                            })
                            .then((sendee) => {
                                //find a way to refactor log
                                if (sendee.anonyString.toString() == data.fid.toString()) {
                                    console.log('im here')
                                    let friends = sendee.anonyChats;
                                    friends = friends.map((chats) => {
                                        if (
                                            chats.chatId.toString() === req.session.user._id.toString()
                                        ) {
                                            //add message to messages array
                                            console.log("saving messages");
                                            let msgs = chats.messages;
                                            msgs.push({
                                                sender: req.session.user_id,
                                                receiver: id,
                                                body: data.message,
                                                isMsgNew: true,
                                                time: data.time
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

                                    let friends = sendee.chats;
                                    friends = friends.map((chats) => {
                                        if (
                                            chats.chatId.toString() === req.session.user._id.toString()
                                        ) {
                                            //add message to messages array
                                            console.log("saving messages");
                                            let msgs = chats.messages;
                                            msgs.push({
                                                sender: req.session.user_id,
                                                receiver: id,
                                                body: data.message,
                                                isMsgNew: true,
                                                time: data.time
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
                                socket.broadcast
                                    .to(id)
                                    .emit("notify", { id: req.session.user._id, len: 20, msg: data.message, time: data.time });
                                //in the notify emitter return the friend id

                                //update ui of receipient
                                //socket.broadcast.to(`${req.session.user._id}${id}`).emit("chatMsg", {
                                //  message: data.message,
                                //});
                                socket.to(`${id}${req.session.user._id}`).emit("chatMsg", {
                                    message: data.message,
                                    time: data.time
                                });

                            })
                            .catch((err) => { });
                        //chat event end
                        socket.on("disconnect", () => {
                            socket.emit("reload", null);
                        });
                    });
                });
                res.render("chatPage", {
                    fid: id,
                    uid: req.session.user._id,
                    meChats: [...msgs],
                    friend: friend,
                    status:status,
                    anStatus:anStatus
                })
            });
        })
};
