const mongoose = require('mongoose');
const schema = mongoose.Schema;
const suggestionSchema = new schema ({
    body: String,
    time: String,
})
module.exports = mongoose.model('suggestion', suggestionSchema);
