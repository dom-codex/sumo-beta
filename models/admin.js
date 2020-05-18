const mongoose = require('mongoose');
const schema = mongoose.Schema;
const adminSchema = new schema ({ 
      name:{
        type: String,
        required: true
      }, 
      phone:{
        type:String,
        required: true  
      },    
       password:{
        type: String,
        required: true
      },     
       suggestions:[
            schema.Types.ObjectId
       ],
    })
    module.exports = mongoose.model('admin', adminSchema);