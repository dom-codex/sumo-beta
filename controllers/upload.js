const multer = require('multer');
const fs = require('fs');
const User = require('../models/user');
const path = require('path');
module.exports.uploader = (req,res) =>{
  const storage = multer.diskStorage({
    destination: function(req, file, cb) {
     // cb(null, path.resolve(__dirname, '/images'))  
      cb(null,path.join( __dirname ,'..', 'images'));
    },
  //path.extname('name to exclude')
    // By default, multer removes file extensions so let's add them back
    filename: function(req, file, cb) {
        cb(null,file.fieldname + '-' + Date.now()+'-'+file.originalname);
    }
  });
  // const regex = new RegExp('/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/')
    const regex = /\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/;
    let upload = multer({ 
        storage: storage,
        fileFilter:function(req, file, cb) {
            // Accept images only
            if (!file.originalname.match(regex)){
                return cb(new Error('Only image files are allowed!'), false);
            }
            return cb(null, true);
        }
    }).single('image');
  
    upload(req, res, function(err) {
      // req.file contains information of uploaded file
      // req.body contains information of text fields, if there were any
      if (!req.file) {
          return res.json('upload failed,try again');
      }else if (req.file.size > 5 * 1024 * 1024){
        fs.unlink(req.file.path, (err) => {
            if (err) {
              console.error(err);
              return;
            }
            return res.json('image too large');
        });
    }   
      else if (err) {
          return res.json(err.message);
      }else{
          const jim = require('../utils/jimpConfig').processImage;
          jim(req.file.path)
          .then(_=>{
          User.findById(req.session.user._id)
          .select('isAnonymous images')
          .then(user=>{
              if(!user) throw new Error('');       else if(user.images &&user.images.open && user.images.open.id.length > 0 &&  !user.isAnonymous){
               require('../utils/driveUpload').driveUploadUpdate(req,res,user.images.open.id,req.file.filename,req.file.path,req.file.mimeType) ;
               // require('../utils/driveUpload').driveUploadDelete(user.images.open.id,) 
              } else if(user.images &&user.images.anonymous.id.length > 0 && user.isAnonymous){
                require('../utils/driveUpload').driveUploadUpdate(req,res,user.images.anonymous.id,req.file.filename,req.file.path,req.file.mimeType) ;
               // require('../utils/driveUpload').driveUploadDelete(user.images.anonymous.id) 
              }else{
              require('../utils/driveUpload').driveUpload(req,res,req.file.filename,req.file.path);
              };
            }); 
          });
      //  require('../utils/driveUpload').driveUpload(req,req.file.filename,req.file.path)
       //require('./utils/driveUpload').driveUploadUpdate('11RxSQtwGuVKHQnTIux0xneHxn0AvLE6h',req.file.filename,req.file.path)
       // require('./utils/driveUpload').driveUploadDelete('11RxSQtwGuVKHQnTIux0xneHxn0AvLE6h')
      };
      console.log(req.file);
  });
};
