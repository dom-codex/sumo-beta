const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const User = require('../models/user')
const AUTHENTICATION = (listFiles) =>{
    // If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}
/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
}
module.exports.driveUpload = (req,res,filename,directory,mime) =>{
function listFiles(auth) {
  const drive = google.drive({version: 'v3', auth});
var folderId = '1E_lDURXuTgOWhtrrOxNqNY7-qGv1_Gdc';
var fileMetadata = {
  'name': filename,
  parents: [folderId]
};
var media = {
  mimeType: mime,
  body: fs.createReadStream(directory)
};
drive.files.create({
  resource: fileMetadata,
  media: media,
  fields: '*'
}, function (err, file) {
  if (err) {
    // Handle error
    console.error(err);
  } else {
    let img;
    console.log('uploaded')
    //console.log('File is : ', file);
    User.findById(req.session.user._id)
    .select('images isAnonymous')
    .then(user=>{
        if(!user) throw new Error('no user')
        else if(user.isAnonymous){
            //user.images.anonymous.link = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`;
           // user.images.anonymous.thumbnail = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
            user.images.anonymous.id = file.data.id,
            //https://lh3.googleusercontent.com/d/1_T1H42q6u3LosvPLYCRdMElLQgoSigxA=s220?authuser=0
            //https://drive.google.com/file/d/1SV2m3pejgUSr0xcMnfiWY2e9LxNa9af1/view?usp=sharing
            user.images.anonymous.link = `https://drive.google.com/uc?export=view&sz=w10h10&id=${file.data.id}`;
            user.images.anonymous.thumbnail = `https://drive.google.com/uc?export=view&sz=w10h10&id=${file.data.id}`;
            img = `https://drive.google.com/uc?export=view&sz=w10h10&id=${file.data.id}`;
            //user.images.anonymous.link = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`;
            //img = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`;
           // user.images.anonymous.thumbnail = `https://drive.google.com/thumbnail?authuser=0&sz=w50h50&id=${file.data.id}`
           //img = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
            return user.save()
        }else{
          //user.images.open.link = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`;
          //user.images.open.thumbnail = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`;
          user.images.open.id = file.data.id,
            user.images.open.link = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
            user.images.open.thumbnail = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
             img = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
           //user.images.open.thumbnail = file.data.thumbnailLink 
           //user.images.open.link = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`
           //img = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`;
          // user.images.open.thumbnail = `https://drive.google.com/thumbnail?authuser=0&sz=w50h50&id=${file.data.id}`
          img = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
            return user.save() 
        }
    })
    .then(user=>{
        fs.unlink(directory, (err) => {
            if (err) {
              console.error(err)
              return
            }
          res.json({
            img:img
          })
            //file removed
          })
    })
  }
});
}
AUTHENTICATION(listFiles)
}
module.exports.driveUploadUpdate = (req,res,id,filename,directory,mime) =>{
    function listFiles(auth) {
      const drive = google.drive({version: 'v3', auth});
  //  var folderId = '1E_lDURXuTgOWhtrrOxNqNY7-qGv1_Gdc';
    var fileMetadata = {
      'name': filename,
     // parents: [folderId]
    };
    var media = {
      mimeType: mime,
      body: fs.createReadStream(directory)
    };
    drive.files.update({
      resource: fileMetadata,
      media: media,
      fields: '*',
      fileId:id //1PkWb9cZJky6ILjopnJaKRm7Bhi-VwRIK
    }, function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
       console.log('updated')
        // console.log('File is : ', file);
        let img;
        User.findById(req.session.user._id).select('images')
        .then(user=>{
            if(!user) throw new Error('no user')
            else if(user.isAnonymous){
              user.images.anonymous.id = file.data.id,
              //https://drive.google.com/file/d/1SV2m3pejgUSr0xcMnfiWY2e9LxNa9af1/view?usp=sharing
              user.images.anonymous.link = `https://drive.google.com/uc?export=view&id=${file.data.id}`;
              user.images.anonymous.thumbnail = `https://drive.google.com/uc?export=view&id=${file.data.id}`;
              img = `https://drive.google.com/uc?export=view&id=${file.data.id}`;
              //user.images.anonymous.link = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`
              //img = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`
              //user.images.anonymous.thumbnail = `https://drive.google.com/thumbnail?authuser=0&sz=w50h50&id=${file.data.id}`
             // user.images.anonymous.link = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
             // user.images.anonymous.thumbnail = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
             // img =`https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
              return user.save()
          }else{
              user.images.open.id = file.data.id,
              user.images.open.link = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
              user.images.open.thumbnail = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
               img = ` https://drive.google.com/uc?export=view&id=${file.data.id}`
             //user.images.open.thumbnail = file.data.thumbnailLink 
             //user.images.open.link = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`
             //img = `https://drive.google.com/thumbnail?authuser=0&sz=w70h70&id=${file.data.id}`
             //user.images.open.thumbnail = `https://drive.google.com/thumbnail?authuser=0&sz=w50h50&id=${file.data.id}`
             //user.images.open.link = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
             //user.images.open.thumbnail =`https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0`
             //img = `https://lh3.googleusercontent.com/d/${file.data.id}=s220?authuser=0` 
             return user.save() 
          }
        })
        .then(user=>{
            fs.unlink(directory, (err) => {
                if (err) {
                  console.error(err)
                  return
                }
              res.json({
                img:img
              })
                //file removed
              })
        })
      }
    });
    }
    AUTHENTICATION(listFiles)
    }
    module.exports.driveUploadDelete = (id) =>{
    function listFiles(auth) {
      const drive = google.drive({version: 'v3', auth});
  //  var folderId = '1E_lDURXuTgOWhtrrOxNqNY7-qGv1_Gdc';
  
    drive.files.delete({
      fileId:id //1PkWb9cZJky6ILjopnJaKRm7Bhi-VwRIK
    }, function (err, file) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
       console.log('removed')
        // console.log('File is : ', file);

      }
    });
    }
    AUTHENTICATION(listFiles)
    }