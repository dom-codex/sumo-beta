const mongoose = require('mongoose');
const schema = mongoose.Schema;
const messageSchema = new schema ({
        imageId:{
            type:String,
            default:''
        },
        imageUrl:{
            type:String,
            default:''
        },     
           thumbId:{
            type:String,
            default:''
        },
        thumbnail:{
            type:String,
            default:''
        },
        downloadLink:{
            type:String,
            default:''
        },
        sender:{
            type:schema.Types.ObjectId,
            refs:'User'
        },
        receiver:{ 
            type:schema.Types.ObjectId,
            refs:'User'
        },
        body: String,
        isMsgNewSender: Boolean,
        isMsgNew: Boolean,
        time: String,
        count:{
            type:Number,
            default:0
        }
    
})
module.exports = mongoose.model('Message', messageSchema);
