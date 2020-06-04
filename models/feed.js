const mongoose = require('mongoose');
const schema = mongoose.Schema;
const feedSchema = new schema ({
        user:String,
        message: String,
        time: String    
})
module.exports = mongoose.model('Feed', feedSchema);
