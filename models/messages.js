const mongoose = require('mongoose');
const schema = mongoose.Schema;
const messageSchema = new schema ({
    
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
    
})
module.exports = mongoose.model('Message', messageSchema);
