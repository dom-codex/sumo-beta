const Jimp = require('jimp');
module.exports.processImage = (directory)=>{
return Jimp.read(directory)
  .then(photo => {
    return photo
      .resize(150, Jimp.AUTO) 
      .write(directory); // save
  })
  .catch(err => {
    console.error(err);
  });
}