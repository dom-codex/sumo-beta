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
      images:{
        open:{
          id:{
            type:String,
            default:''
          },
          link:{
          type:String,
          default: ` https://drive.google.com/uc?export=view&id=1JRaLV1j3evf8p_F-zqtWBKu2Asn6ntqO`
        },
          thumbnail:{
            type:String,
            default: ` https://drive.google.com/uc?export=view&id=1JRaLV1j3evf8p_F-zqtWBKu2Asn6ntqO`
          }
        },
        anonymous:{
          id:{ 
            type:String,
            default:''
          },
          link:{ 
            type: String,
            default: ` https://drive.google.com/uc?export=view&id=1nIQf8yGrjzFEV6v3BeIHIyVVO7yg7Xtt`
          },
          thumbnail:{
            type:String,
            default: ` https://drive.google.com/uc?export=view&id=1nIQf8yGrjzFEV6v3BeIHIyVVO7yg7Xtt`
        }
      },
    },
      isVerified:{
        type:Boolean,
        default:false
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
      userToken: String,
      tokenMaxAge: Number,
      requests:[
        {
          
           name: String,
           id: schema.Types.ObjectId,
           desc: String,
           img:String
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
