const mongoose = require('mongoose');
const schema = mongoose.Schema;
const requestSchema = new schema ({
        requester:{
            type:schema.Types.ObjectId,
            refs:'User'
        },
        requestee: {
            type:schema.Types.ObjectId,
            refs:'User'
        },    
})
module.exports = mongoose.model('Request', requestSchema);
