const User = require("../models/user");
const detectors = require('../utils/detectors')
module.exports.anonymousUserMode = (req, res, next, io) => {
    let page = +req.query.page || 1;
    let nAnonyChats;
    let me;
    let chatids = []
    //reformat this line later
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
            return User.find({ _id: { $in: chatids } })
            .sort({'chats.messages.stamp':'desc',$natural:'desc'})
            .skip((page - 1) * 2)
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
                            .emit("online", { name: me.anonymousName, fid: id });
                    });
                    //socket.broadcast.emit("online", { name: '6anonymous', fid: id, })
                    //  socket.emit("activeUsers", onlineUser);
                });
                socket.on("disconnect", () => {
                    socket.broadcast.emit("left", me._id);
                    //trigger an offline timer as soon as the user disconnects from socket layer
                    detectors.goOffline(me.anonyString,socket)
                    socket.disconnect(true);
                });
            });
            //iterate through the chat list of the resulting users we are chatting with anonymously
            const reformedChatList = onlineUser.map(aUser => {
                const onList = aUser.chats.some(chat=>chat.chatId.toString() === req.session.user.anonyString.toString())
                if(!onList){
                    return {
                        name:aUser.name,
                        _id: aUser._id,
                        message:'user removed you'

                    }
                }
                //retrieve particular element from user chats where the chatid in user chats matches with their id
                const myChatsWithUser = me.anonyChats.find(chat => chat.chatId.toString() === aUser._id.toString())
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
                csrfToken:req.csrfToken(),
                hasNext: 2 * page < nAnonyChats,
                hasPrev: page > 1,
                next: page + 1,
                prev: page - 1,
                onlineUsers: filteredUsersList,
            });
        });
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
            const index = me.anonyChats.findIndex(member => member.chatId.toString() === id.toString)
            //retrieve the actual document
            let chatUser = me.anonyChats.find(chat => chat.chatId.toString() === id.toString())
           //retrieve the messages
            let messagesWithUser = chatUser ? chatUser.messages: []//me.chats.find(chat => chat.chatId.toString() === id.toString()).messages
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
            User.findById(id)
            .then(myf => {
                //get their names and status
                if (myf) {
                    const onList = myf.chats.some(chat=>chat.chatId.toString() === req.session.user.anonyString.toString())
                    friend = myf.name;
                    status = onList ? myf.status :'removed';
                    return null
                } else {
                    //redundant remember to remove
                    return User.findOne({ anonyString: id }) //search for the user if they are actually anonymous
                }
            }).then(myf => {
                if (myf) {
                    //a bit redundant remove later
                    //set to their anonymous name later
                    const onList = myf.chats.some(chat=>chat.chatId.toString() === req.session.user.anonyString.toString())
                    friend = myf.anonymousName
                    status = onList ? myf.anonymousStatus : 'removed you'
                }
            //set up socket connection listener
            io().once("connect", (socket) => {
            //set up online trigger
              detectors.goOnline(req.session.user.anonyString,socket)
              socket.on('disconnect',()=>{
                  //set up offline trigger
                  detectors.goOffline(req.session.user.anonyString,socket)
              })  
              //join a room with the user token and the chat id  
              //this is meant to ensure uniqueness when broadcasting
              socket.join(`${req.session.user.anonyString}${id}`); //add anonychatstring
              //listener for marking all new messages as old  
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
                                } else return msg // retain old messages
                            })
                            user.save()
                        }).catch(err=>{
                            //do nothing
                        })
                })
                //chat listener
            });
            res.render("chatPage", { 
                fid: id, 
                csrfToken:req.csrfToken(),
                uid:req.session.user._id,
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
            //extract all chat ids in user chats array
            let chatid = user.chats.map((id) => {
                return id.chatId;
            });
            chatids = chatid
            //get a count of the total chats user has
            return User.find({ _id: { $in: chatids } }).countDocuments()
        })
        .then((nOpenChats) => {
            //online user will be docs of the with the specified ids
            nTotalOpenChats = nOpenChats;
            //get a count of the total anonymous chats user has
            return User.find({ anonyString: { $in: chatids } }).countDocuments()
        })
        .then(nAnonyusers => {
            nTotalAnonyChats = nAnonyusers
            return
        })
        .then(_ => {
            //query db for the chats but limiting the results based on the page user is in
            User.find({ _id: { $in: chatids } }).sort({'chats.messages.stamp':'desc',$natural:'desc'}).skip((page - 1) * 2)
                .limit(2)
                .then((onlineUser) => {
                //query db for anonymous chat but limiting the result based on the page user is in
                    User.find({ anonyString: { $in: chatids } }).sort({$natural:-1}).skip((page - 1) * 2).limit(2)
                        .then(anonyusers => {
                            //reform the anonymous user docs
                            if (anonyusers.length > 0) {
                                anonymous = anonyusers.map((a, i) => {
                                    const onList = a.anonyChats.some(chat=>chat.chatId.toString() === req.session.user._id.toString())
                                    if(!onList){
                                        return {
                                            name:a.anonymousName,
                                            _id: a.anonyString,
                                            message:'user removed you'
    
                                        }
                                    }else{
                                    const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === a.anonyString.toString())
                                    return {
                                        name: a.anonymousName,
                                        _id: a.anonyString,
                                        anStatus:a.anonymousStatus,
                                        message:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body : 'anonymous chat',
                                        isNew:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew : false,
                                        time: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time : '',
                                        stamp: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].stamp : ''

                                    }
                                }
                                })
                            }
                            const feedRoom = io();
                            feedRoom.once("connect", (socket) => {
                                detectors.goOnline(me._id, socket)
                                
                                //once a socket is connected it joins a room
                                //which is formed by thr user id
                            
                                socket.join(me._id); //user joins a specific room via their id
                                //listener to inform chats user is online
                                socket.on("identify", (id) => {
                                    //query db for user returning only the chats field
                                    //we iterate through the ids and emit the online event
                                    //to the rooms of our individual users
                                     const stillInChat=[...onlineUser,...anonyusers].map(active=>{
                                        const inOpenChat =  active.chats.some(id=>id.chatId === req.session.user._id)
                                        const inClosedChat =  active.anonyChats.some(id=>id.chatId === req.session.user._id)
                                     if(inOpenChat){
                                         return active._id
                                     }else if(inClosedChat){
                                         return active.anonyString
                                     }
                                    })                                                   
                                    /*chatids*/stillInChat.forEach((element) => {
                                        socket.broadcast
                                            .to(element)
                                            .emit("online", { name: me.name, fid: id });
                                    });

                                });
                                socket.on("disconnect", () => {
                                  //  socket.broadcast.emit("left", me._id);
                                    detectors.goOffline(me._id, socket)
                                    socket.disconnect(true);
                                });
                            });
                            //reformat the user list adding the last message recieved or sent ,the time and state
                            const reformedChatList = onlineUser.map(aUser => {
                                //check if we are on chatlist
                                const onList = aUser.chats.some(chat=>chat.chatId.toString() === req.session.user._id.toString())
                                if(!onList){
                                    return {
                                        name:aUser.name,
                                        _id: aUser._id,
                                        message:'user removed you'

                                    }
                                }else{
                                const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === aUser._id.toString())
                                return {
                                    name: aUser.name,
                                    _id: aUser._id,
                                    status:aUser.status,
                                    isNew:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].isMsgNew : false,
                                    message:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].body : 'say hi',
                                    time:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].time : '',
                                    stamp:myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[myChatsWithUser.messages.length - 1].stamp : ''
                                }
                            }
                            })
                            //filter array so that new messages are displayed first
                            let filteredUsersList = [];
                            [...reformedChatList, ...anonymous].forEach(user => {
                                if (user.isNew || user.status === 'online'|| user.anStatus === 'online') {
                                    filteredUsersList.unshift(user)
                                } else {
                                    filteredUsersList.push(user)
                                }
                            })
                            const inform = req.flash('inform')
                            return res.render("feed", {
                                name: me.name,
                                phone: me.phone,
                                feed: me.feeds,
                                sharelink: me.share,
                                uid: me._id,
                                chat: me.chatShare,
                                inform: inform.length > 0 ? inform[0] : {status:false,msg:''},
                                csrfToken:req.csrfToken(),
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
    const id = req.params.chatId;
    let friend;
    let status;
    let anStatus;
    User.findById(req.session.user._id)
        .then((me) => {
            //retrieve the location of chat in our chats array
            const index = me.chats.findIndex(member => member.chatId.toString() === id.toString())
            //retrieve actual docs of chat and current user
            let chatUser = me.chats.find(chat => chat.chatId.toString() == id.toString())
            //get user messages with chat
            let messagesWithUser = chatUser.messages;
            //set all new message to false
            messagesWithUser = messagesWithUser.map(msg => {
                if (msg.isMsgNew === true) {
                    msg.isMsgNew = false
                    return msg
                } else return msg
            })
            chatUser.messages = messagesWithUser; //initialize with updated message array
            me.chats[index] = chatUser; //add the updated docs back to its location
            me.save(); //dont wait for promise
            const mychats = me.chats;
            const pal = chatUser
            /*mychats.find(
                (chats) => chats.chatId.toString() === id.toString()
            );*/

            const palmsgs = pal ? pal.messages : [];
            return palmsgs
        })
        .catch((err) => {
            throw err;
        })
        .then((msgs) => {
            User.findById(id).
            then(myf => {
                //myf === myfriend
                if (myf) {
                    //get friend name and online status if in normal mode
                    const onList = myf.chats.some(chat=>chat.chatId.toString() === req.session.user._id.toString())
                  
                    friend =  myf.name ;
                    status = onList ? myf.status : 'removed you';

                    return null
                } else {
                    return User.findOne({ anonyString: id })
                }
            }).then(myf => {

                if (myf) {
                    //get anonymous name and online status 
                    const onList = myf.anonyChats.some(chat=>chat.chatId.toString() === req.session.user._id.toString())
                    friend = myf.anonymousName;
                    status = onList?myf.anonymousStatus : 'removed you';
                    
                }
                io().once("connect", (socket) => {
                    //online trigger
                  detectors.goOnline(req.session.user._id,socket)
                  socket.on('disconnect',()=>{
                      //offline trigger
                      detectors.goOffline(req.session.user._id,socket)
                  })  
                  //user joins room corresponding to their id and that of the chats
                  //this to maintain uniqueness
                  socket.join(`${req.session.user._id}${id}`);
                  socket.on('typing',(friendId)=>{
                      io().
                      to(`${friendId}${req.session.user._id}`)
                      .emit('isTyping')
                  })                   
                   socket.on('stopTyping',(friendId)=>{
                      io().
                      to(`${friendId}${req.session.user._id}`)
                      .emit('stoppedTyping')
                  })  
                  socket.on('receive', () => {
                        //set all isNew field in the mesage
                        //to false if user reads message immediately
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
                });
                res.render("chatPage", {
                    fid: id,
                    csrfToken:req.csrfToken(),
                    uid: req.session.user._id,
                    meChats: [...msgs],
                    friend: friend,
                    status:status,
                    anStatus:anStatus
                })
            });
        })
};
