const User = require('../models/user');
let timer;
 module.exports.goOffline = (id,socket)=>{ 
     timer = setTimeout(()=>{

    User.findOne({$or:[{_id:id},{anonyString:id}]})
         .then(user=>{
        
            if(!user.isAnonymous){
             user.status = "offline";
             return user.save();
            }
            else{
                user.anonymousStatus = 'offline';
                return user.save();
            }
         })
         .then(user=>{
         //send notfications to all chats if open
         //or to anony chats
         if(!user.isAnonymous){
          const myChats = [...user.chats];
          myChats.forEach(chats=>{
              socket.broadcast.to(chats.chatId)
              .emit('offline',{chat:user._id});
              socket.broadcast.to(`${chats.chatId}${id}`)
              .emit('offline',{status:'offline'});
          })
         }else{
            const myChats = [...user.anonyChats];
            myChats.forEach(chats=>{
                socket.broadcast.to(chats.chatId)
                .emit('offline',{chat:user.anonyString});
                socket.broadcast.to(`${chats.chatId}${id}`)
                .emit('offline',{status:'offline'});
                //tell client the open user is offline
            }) 
         }
         }).catch(err=>{
console.log(err);
         });
        },2000); 
 };
 module.exports.goOnline = (id,socket)=>{
     clearTimeout(timer);
     User.findOne({ $or:[{anonyString:id},{_id:id},]})
     .then(user=>{
         if(user.status !== 'online' && !user.isAnonymous){
         user.status = 'online';
         return user.save();
        }else if(user.isAnonymous && user.status !== 'online'){
            user.anonymousStatus = 'online';
            return user.save();

        }
        return user;
     })
     .then(user=>{
         if(user !== null){
            if(!user.isAnonymous){
                const myChats = [...user.chats];
                myChats.forEach(chats=>{
                    socket.broadcast.to(chats.chatId).emit('active',{chat:user._id});
                    socket.broadcast.to(`${chats.chatId}${id}`)
                    .emit('active',{status:'online'});
                });
                
               }else{
                  const myChats = [...user.anonyChats];
                  myChats.forEach(chats=>{
                      socket.broadcast.to(chats.chatId)
                      .emit('active',{chat:user.anonyString});
                      socket.broadcast.to(`${chats.chatId}${id}`)
                      .emit('active',{status:'online'});
                    }); 
               }
         }
     }).catch(err=>{
      console.log('error');
     });
 };