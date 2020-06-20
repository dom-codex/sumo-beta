const User = require('../models/user');
const Message = require('../models/messages');
const io = require('../socket').getIO;
module.exports.uploadMMS = (req,res,imgID,imgUrl,d) =>{
    const receiver = req.body.receiver;
    const message = req.body.message;
    const time = req.body.time;
    let pal;
    let userId;
    let msgID;
    User.findById(req.session.user._id)
      .then(async(user) => {
        let chat
        for await(let pally of User.findOne({$or:[{_id:receiver},{anonyString:receiver}]}).select('chats anonyChats isAnonymous')){
        if(pally.isAnonymous){
          chat = pally.anonyChats
        }else{
          chat = pally.chats
        }
        }
        //check if user is valid
        if (user.isAnonymous) {
          userId = user.anonyString
          pal = user.anonymousName
        } else {
          userId = user._id
          pal = user.name
        }
        //retrive the chats array from senders details
        let friends;
        if (user.isAnonymous) {
          friends = user.anonyChats
        } else {
          friends = user.chats
        }
        //check if user is no longer friends with chat
      const stillPals = chat.some(f=>f.chatId.toString() === userId.toString());
      if(!stillPals){
        return res.json({
          code:300,
          message:'message not sent because you are no longer pals with this user'
        })
      }
        const messages = new Message({
          imageId:imgID,
          downloadLink:d,
          imageUrl:imgUrl,
          sender: userId,
          receiver: receiver,
          time: time,
          body: message,
          isMsgNew: true,
          isMsgNewSender: false
        })
        messages.save()
          .then(message => {
            msgID = message._id
            friends = friends.map((chats) => {
              if (chats.chatId.toString() === receiver.toString()) {
                //add message to chat messages array in user chats
                chats.lastUpdate = new Date()
               /* let msgs = chats.messages;
                msgs[0] = message._id
                chats.messages = msgs;*/
                return chats;
              } else {
                return chats; //to keep all other chats
              }
            });
            if (user.isAnonymous) {
              user.anonyChats = friends
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
                  chats.lastUpdate = new Date()
                 /* let msgs = chats.messages;
                  msgs[0]= msgID
                  chats.messages = msgs;*/
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
                  chats.lastUpdate = new Date()
                 /* let msgs = chats.messages;
                  msgs[0] = msgID
                  chats.messages = msgs;*/
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
              .emit("notify", { 
                id: userId, 
                name: pal.split(' ')[0], 
                msg: message,
                withImage:true,
                time: time });
            //in the notify emitter return the friend id
  
            //update ui of receipient if in chat room
  
            io().to(`${receiver}${userId}`).emit("chatMsg", {
              message: message,
              time: time,
              img:imgUrl,
              download:d
            });
            res.json({
              code: 204,
              message: 'sent sucessfully',
              img:imgUrl,
              class:req.body.tag
            })
          })
      })
      .catch((err) => {
        console.log(err)
      });
  
}