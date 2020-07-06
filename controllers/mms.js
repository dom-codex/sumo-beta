const multer = require('multer');
const fs = require('fs');
const User = require('../models/user');
const path = require('path');
module.exports.sendMMS = (req,res,next)=>{
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
              return res.json({
                code:300,
                err:'upload failed',
                class: req.body.tag
              });
          }else if (req.file.size > 5 * 1024 * 1024){
            fs.unlink(req.file.path, (err) => {
                if (err) {
                  console.error(err);
                  return;
                }
                return res.json({
                  code:300,
                  class:req.body.tag,
                  err:'image too large'});
            });
        }   
          else if (err) {
              return res.json({
                err:err.message,
                class:req.body.tag,
                code:300
              }
                );
          }else{
            const sharp = require('sharp');
            const fileLocation = path.join( __dirname ,'..', 'photo',req.file.filename);
            try{
              sharp(req.file.path).resize(150,150).toFile(fileLocation,(err,img)=>{
                err?console.log(err):require('../utils/driveUpload').uploadMMSThumbnail(req,res,req.file.filename,fileLocation,req.file.mimeType);

              })
            }catch(err){
              console.log(err)
            }
          }
      });
};