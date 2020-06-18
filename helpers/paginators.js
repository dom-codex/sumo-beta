const Message = require('../models/messages')
const Feed = require('../models/feed')
const User = require('../models/user')
module.exports.chatPaginator = (req, res, next) => {
    const page = +req.query.page || 1
    let totalMessages;
    const uid = req.body.uid
    const fid = req.body.fid
    let last;
    if (page <= 0) return
    Message.find({ $or: [{ $and: [{ sender: uid }, { receiver: fid }] }, { $and: [{ sender: fid }, { receiver: uid }] }] }).countDocuments()
        .then(nMessages => {
            totalMessages = nMessages
            last = (Math.ceil((totalMessages) / 10))
            if ((Math.ceil((totalMessages) / 10) >= last)) {
                return Message.find({ $or: [{ $and: [{ sender: uid }, { receiver: fid }] }, { $and: [{ sender: fid }, { receiver: uid }] }] })
                    .sort({ $natural: -1 }).skip((page - 1) * 10).limit(10)
            }
        })
        .then(messages => {
            if (messages) {
                return res.json(
                    {
                        messages: messages,
                        next: page + 1,
                        code: 200
                    }
                )
            }
        })
}
module.exports.loadFeeds = (req, res, next) => {
    const page = +req.query.page || 1
    let totalFeeds;
    let last;
    if (page <= 0) return
    User.findById(req.session.user._id).select('share feeds')
        .then(user => {

            Feed.find({user:user.share }).countDocuments()
                .then(nFeeds => {
                    totalFeeds = nFeeds
                    last = (Math.ceil((totalFeeds) / 10))
                    if ((Math.ceil((totalFeeds) / 10) >= last)) {
                        return Feed.find({ user: user.share })
                            .sort({ $natural: -1 }).skip((page - 1) * 10).limit(10)
                    }
                })
                .then(feeds => {
                    if (feeds) {
                        return res.json(
                            {
                                feeds: feeds,
                                next: page + 1,
                                code: 200
                            }
                        )
                    }
                })
        })

}
module.exports.loadChats =  async(req, res, next) => {
    const page = +req.query.page || 1
    let anonymous = []
    let me;
    let chatids;
    let nTotalOpenChats;
    let nTotalAnonyChats;
    User.findOne({ _id: req.session.user._id })
        .select('name email chats _id images')
        .then((user) => {
            me = user
            //extract all chat ids in user chats array
            let chatid = user.chats.map((id) => {
                return id.chatId;
            });
            chatids = chatid
            //get a count of the total chats user has
            return User.find({ _id: { $in: chatids } })
                .countDocuments()
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
            User.find({ _id: { $in: chatids } })
                .sort({ 'chats.lastUpdate': -1 })
                .skip((page - 1) * 1)
                .limit(1)
                .then((onlineUser) => {
                    //query db for anonymous chat but limiting the result based on the page user is in
                    User.find({ anonyString: { $in: chatids } })
                        .sort({ $natural: -1, 'chats.lastUpdate': -1 })
                        .skip((page - 1) * 1)
                        .limit(1)
                        .then(async(anonyusers) => {
                            //reform the anonymous user docs
                            let messages = []
                            const chatid = [...onlineUser].map((chat) => {
                                return chat._id;
                            });                    
                            const Achatid = [...anonyusers].map((chat) => {
                                return chat.anonyString;
                            });
                            const ids = [...chatid,...Achatid]
                            let i = 0;
                            while(i < ids.length){
                            for await (const doc of Message.findOne({ $or: [{ $and: 
                                [{ sender: ids[i] }, 
                                { receiver: me._id }] }, 
                                { $and: [{ sender: me._id }, 
                                { receiver: ids[i] }] }]})
                                .sort({$natural:-1}).limit(1)) {
                                messages.push(doc)
                              }
                              i++
                            }
                            if (anonyusers.length > 0) {
                                anonymous = anonyusers.map((a, i) => {
                                    const onList = a.anonyChats.some(chat => chat.chatId.toString() === req.session.user._id.toString())
                                    if (!onList) {
                                        return {
                                            name: a.anonymousName,
                                            _id: a.anonyString,
                                            img: a.images.anonymous.thumbnail,
                                            message: 'user removed you',
                                            time:''

                                        }
                                    } else {
                                       // const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === a.anonyString.toString())
                                        const ourMessages = messages.find(m=>m.sender.toString()=== a.anonyString.toString() || m.receiver.toString() === a.anonyString.toString() )
                                        return {
                                            name: a.anonymousName,
                                            _id: a.anonyString,
                                            img: a.images.anonymous.thumbnail,
                                            anStatus: a.anonymousStatus,
                                            message: ourMessages && ourMessages.body.length > 0 ? ourMessages.body : 'anonymous chat',
                                            isNew: ourMessages && ourMessages.isMsgNew ? ourMessages.isMsgNew : false,
                                            time: ourMessages && ourMessages.time.length > 0 ? ourMessages.time : '',
                                        } 
                                        /*return {
                                            name: a.anonymousName,
                                            _id: a.anonyString,
                                            img: a.images.anonymous.thumbnail,
                                            anStatus: a.anonymousStatus,
                                            message: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].body : 'anonymous chat',
                                            isNew: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].isMsgNew : false,
                                            time: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].time : '',
                                        }*/
                                    }
                                })
                            }

                            //reformat the user list adding the last message recieved or sent ,the time and state
                            const reformedChatList = onlineUser.map(aUser => {
                                //check if we are on chatlist
                                const onList = aUser.chats.some(chat => chat.chatId.toString() === req.session.user._id.toString())
                                if (!onList) {
                                    return {
                                        name: aUser.name,
                                        _id: aUser._id,
                                        img: aUser.images.open.thumbnail,
                                        message: 'user removed you',
                                        time:''

                                    }
                                } else {
                                  //  const myChatsWithUser = me.chats.find(chat => chat.chatId.toString() === aUser._id.toString())
                                    const ourMessages = messages.find(m=>m.sender.toString()=== aUser._id.toString() || m.receiver.toString() === aUser._id.toString() )
                                    return {
                                        name: aUser.name,
                                        _id: aUser._id,
                                        img: aUser.images.open.thumbnail,
                                        status: aUser.status,
                                        isNew: ourMessages && ourMessages.isMsgNew ? ourMessages.isMsgNew : false,
                                        message: ourMessages && ourMessages.body.length > 0 ? ourMessages.body : 'say hi',
                                        time: ourMessages && ourMessages.time.length > 0 ? ourMessages.time : '',
                                    }
                                    /*return {
                                        name: aUser.name,
                                        _id: aUser._id,
                                        img: aUser.images.open.thumbnail,
                                        status: aUser.status,
                                        isNew: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].isMsgNew : false,
                                        message: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].body : 'say hi',
                                        time: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].time : '',
                                    }*/
                                }
                            })
                            res.json({
                                chats: [...reformedChatList, ...anonymous],
                                hasPrev: page > 1,
                                next: page + 1,
                                prev: page - 1,
                                hasNext: 1 * page < nTotalAnonyChats + nTotalOpenChats,
                            })
                        });
                }); //end of anonyusers then
        });
};
module.exports.loadChatsForAnonymousUser = (req, res, next) => {
    let page = +req.query.page || 1;
    let nAnonyChats;
    let me;
    let chatids = []
    User.findOne({ _id: req.session.user._id })
        .select('name email anonyChats anonyString images')
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
                .sort({ $natural: -1, 'chats.lastUpdate': -1 })
                .skip((page - 1) * 5)
                .limit(5)
        }).then(async(onlineUser) => {
            //iterate through the chat list of the resulting users we are chatting with anonymously
            let messages = []
            const chatid = [...onlineUser].map((chat) => {
                return chat._id ;
            });
            let i = 0;
            while(i<chatid.length){
            for await (const doc of Message.find({ $or:
                 [{ $and: [{ sender: chatid[i] }, 
                { receiver: me.anonyString }] }, 
                { $and: [{ sender: me.anonyString }, 
                { receiver: chatid[i] }] }]}).sort({$natural:-1}).limit(1)) {
                messages.push(doc)
              }
              i++
            }
            const reformedChatList = onlineUser.map(aUser => {
                const onList = aUser.chats.some(chat => chat.chatId.toString() === req.session.user.anonyString.toString())
                if (!onList) {
                    return {
                        name: aUser.name,
                        _id: aUser._id,
                        img: aUser.images.open.link,
                        message: 'user removed you',
                        time:''

                    }
                }
                //retrieve particular element from user chats where the chatid in user chats matches with their id
               // const myChatsWithUser = me.anonyChats.find(chat => chat.chatId.toString() === aUser._id.toString())
                // const myChatsWithUser = aUser.chats.find(chat => chat.chatId.toString() === req.session.user.anonyString.toString())
                //format the result of this queries
                const ourMessages = messages.find(m=>m.sender.toString()=== aUser._id.toString() || m.receiver.toString() === aUser._id.toString() )
                return {
                    name: aUser.name,
                    _id: aUser._id,
                    img: aUser.images.open.thumbnail,
                    status: aUser.status,
                    isNew: ourMessages && ourMessages.isMsgNew ? ourMessages.isMsgNew : false,
                    message: ourMessages && ourMessages.body.length > 0 ? ourMessages.body : 'say hi',
                    time: ourMessages && ourMessages.time.length > 0 ? ourMessages.time : '',
                }
                /*return {
                    name: aUser.name,
                    _id: aUser._id,
                    status: aUser.status,
                    img: aUser.images.open.thumbnail,
                    isNew: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].isMsgNew : false,
                    message: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].body : 'say hi',
                    time: myChatsWithUser && myChatsWithUser.messages.length > 0 ? myChatsWithUser.messages[0].time : ''
                }*/
            })
            res.json({
                chats: [...reformedChatList],
                hasPrev: page > 1,
                next: page + 1,
                prev: page - 1,
                hasNext: 1 * page < nAnonyChats.length,
            });
        });
}
module.exports.loadChatsInProfile = (req, res, next) => {
    let ntotalOpenUsers;
    let nTotalAnonyUsers;
    const page = +req.query.page || 1
    if (page < 1) return res.json({ code: 404, message: 'page not found' })
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
            User.find({ _id: { $in: chatids } })
                .sort({ $natural: -1 })
                .skip((page - 1) * 2)
                .limit(2)
                .then(openchats => {
                    openchats = [...openchats].map(chats => {
                        return {
                            name: chats.name,
                            _id: chats._id,
                            desc: chats.desc,
                            img: chats.images.open.thumbnail,
                            status: chats.status
                        }
                    })
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
                                    img: chats.images.anonymous.thumbnail,
                                    status: chats.anonymousStatus
                                }
                            })
                            res.json({
                                chats: [...openchats, ...anonymousChats],
                                hasPrev: page > 1,
                                next: page + 1,
                                prev: page - 1,
                                hasNext: 2 * page < nTotalAnonyUsers + ntotalOpenUsers,
                            });
                        });
                });
        });
};
module.exports.loadChatsForAnonymousProfile = (req, res, next) => {
    const page = +req.query.page || 1;
    let ntotalOpenUsers;
    let chatids;
    User.findById(req.session.user._id)
        .then((user) => {
            //filter out open chats id
            const chatid = user.anonyChats.map((id) => {
                return id.chatId;
            });
            //initialize the somewhat global variable
            chatids = chatid;
            return chatid;
        })
        .catch(err => {
            throw err
        })
        .then(ids => {
            //get a of users the user  openly chat with
            return User.find({ _id: { $in: ids } }).countDocuments()
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
            /*retrieve actual users we chatted with but limiting
            the no of records returned based on a chosen
            filtering condition i.e max of 2 users per page
             */
            User.find({ _id: { $in: chatids } })
                .sort({ $natural: -1 })
                .skip((page - 1) * 2)
                .limit(2)
                .then(openchats => {
                    /*retrive users that chatted with user anonymously
                    limiting the records returned by a chosen preference */
                    //retrieve flash message
                    const myChats = [...openchats].map(chats => {
                        return {
                            name: chats.name,
                            _id: chats._id,
                            desc: chats.desc,
                            img: chats.images.open.thumbnail,
                            status: chats.status
                        }
                    })
                    res.json({
                        chats: myChats
                    })
                })
                .catch(err => {
                    next(err)
                })
        })
        .catch(err => {
            next(err)
        })//end of open chat then
        .catch((err) => {
            next(err)
        });
};
