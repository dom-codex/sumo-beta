const multer = require('multer')
const User = require('../models/user');
module.exports.uploader = (req,res,storage) =>{
    const regex = new RegExp('/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/')
    let upload = multer({ 
        storage: storage,
        fileFilter:function(req, file, cb) {
            // Accept images only
            if (!file.originalname.match(regex)){
                return cb(new Error('Only image files are allowed!'), false);
            }
            cb(null, true);
        }
    }).single('image');
  
    upload(req, res, function(err) {
      // req.file contains information of uploaded file
      // req.body contains information of text fields, if there were any
      if (!req.file) {
          return res.json('Please select an image to upload');
      }
      else if (err) {
          return res.json(err);
      }else{
          User.findById(req.session.user._id)
          .select('isAnonymous images')
          .then(user=>{
              if(!user) throw new Error('')
              else if(user.images&&user.images.open.id.length > 0 &&  !user.isAnonymous){
                require('../utils/driveUpload').driveUploadUpdate(req,res,user.images.open.id,req.file.filename,req.file.path) 
              } else if(user.images &&user.images.anonymous.id.length > 0 && user.isAnonymous){
                require('../utils/driveUpload').driveUploadUpdate(req,res,user.images.anonymous.id,req.file.filename,req.file.path) 
              }else{
              require('../utils/driveUpload').driveUpload(req,res,req.file.filename,req.file.path)

              }
          })
      //  require('../utils/driveUpload').driveUpload(req,req.file.filename,req.file.path)
       //require('./utils/driveUpload').driveUploadUpdate('11RxSQtwGuVKHQnTIux0xneHxn0AvLE6h',req.file.filename,req.file.path)
       // require('./utils/driveUpload').driveUploadDelete('11RxSQtwGuVKHQnTIux0xneHxn0AvLE6h')
      }
      console.log(req.file)
  })
}