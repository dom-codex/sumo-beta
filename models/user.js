const mongoose = require('mongoose');
const schema = mongoose.Schema;
const UserSchema = new schema ({ 
      name:{
        type: String,
        required: true
      },
      email: {
        type: String,
      },
      password: {
        type: String,
      },
      desc:String,
      gender: String,
      phone: String,
      share: String,
      chatShare: String,
      anonymousName: String,
      anonyString: schema.Types.ObjectId,
      isAnonymous: Boolean,
      resetToken: String,
      tokenMaxAge: Number,
      feeds:[
        {
        message: String,
        time: String
      }
    ],
      status: String,
      anonymousStatus: String,
      chats: [
        {
          chatId:{
            type: schema.Types.ObjectId,
            refs: 'User'
          },
          messages:[
            {
              sender:{
                  type:schema.Types.ObjectId,
                  refs:'User'
              },
              receiver:{ 
                  type:schema.Types.ObjectId,
                  refs:'User'
              },
              body: String,
              isMsgNew: Boolean,
              time: String

          }
          ],
        }
      ],     
       anonyChats: [
        {
          chatId:{
            type: schema.Types.ObjectId,
            refs: 'User'
          },
          messages:[
            {
              sender:{
                  type:schema.Types.ObjectId,
                  refs:'User'
              },
              receiver:{ 
                  type:schema.Types.ObjectId,
                  refs:'User'
              },
              body: String,
              isMsgNew: Boolean
          }
          ],
        }
      ]

})
module.exports = mongoose.model('User', UserSchema);
