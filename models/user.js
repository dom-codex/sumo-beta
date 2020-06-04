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
      requests:[
        {
          
           name: String,
           id: schema.Types.ObjectId,
           desc: String
        }
      ],
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
            ref: 'User'
          },
          lastUpdate:Number,
          messages:[
            {
              type:schema.Types.ObjectId,
              ref:'Message'
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
          lastUpdate:Number,
          messages:[
            {
              type:schema.Types.ObjectId,
              ref:'Message'
            }
          ],
        }
      ]

},{timestamps:true})
module.exports = mongoose.model('User', UserSchema);
