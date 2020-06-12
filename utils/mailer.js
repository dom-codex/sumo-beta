const style = `
*{
  font-family: Rubik
}
body{
  margin:15px 0 0 20px
}
.appname{
font-size:1.65em;
font-family: Rubik
}
.name{
  text-transform: uppercase;
  font-size:1.5em;
  font-family:Rubik
}
p{
font-size:1.29em
}
a.link{
  text-decoration: none;
  padding:10px;
  border-radius:5px;
  background-color: rebeccapurple;
  color:white;
  letter-spacing:1px
}
`;
const nodemailer = require('nodemailer');
module.exports.mailer = (req,res,email,name,link)=>{
  const headUrl = process.env.urlHead || `http://localhost:3000`
    const transporter = nodemailer.createTransport({
      /*host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "746d242333b2a4",
        pass: "93663e3aafe21d"
      }*/
  
      service: "gmail",
        auth: {
          user: "sumomessenger.beta@gmail.com",
          pass: process.env.mailer_pass
        } 
      
    });
  const mailOptions = {
      from: 'sumomessenger.beta@gmail.com',
      to: email,
      subject: 'Password reset',
      html:`
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet"/>
      <style type="text/css" rel="stylesheet">
      ${style}
    .note{
      margin-top:20px
    }
      </style>
      </head>
      <body>
      <h2 class="appname">SUMO messenger</h2>
      <p class="name">HI ${name},</p>
      <p>Forgot your password ? no probs!!! just click the link below to reset your password</p>
      <a class="link" href="${headUrl}/setnewpassword/${link}">Reset password</a>
      <div class="note">
      <i>
      *If you didn’t make this request, or made it by mistake, please ignore this email. Your password will remain as it was.
      </i></div>
      </body>
      </html>
      ` 
    };
    
    transporter.sendMail(mailOptions,(error, info)=>{
      if (error) {
        console.log(error);
        req.flash('noUser', { message:'something went wrong try again!' })
        req.session.save(()=>{
         return res.redirect('/resetpassword')
        })
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
       req.flash('success',true)
       req.session.save(()=>{
        return res.redirect('/resetpassword')
       })
      }
    });
}
module.exports.confirmationMailer = (email,name,id)=>{
  const headUrl = process.env.urlHead || `http://localhost:3000`
    const transporter = nodemailer.createTransport({
      /*host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "746d242333b2a4",
        pass: "93663e3aafe21d"
      }*/
  
      service: "gmail",
        auth: {
          user: "sumomessenger.beta@gmail.com",
          pass: process.env.mailer_pass
        } 
      
    });
  const mailOptions = {
      from: 'sumomessenger.beta@gmail.com',
      to: email,
      subject: 'Email verification',
      html:`
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet"/>
      <style type="text/css" rel="stylesheet">
      ${style}
      </style>
      </head>
      <body>
      <h2 class="appname">SUMO messenger</h2>
      <p class="name">HI ${name},</p>
      <p>Your are one step away from activating your account,
       click the link below to activate your account</p>
      <a class="link" href="${headUrl}/channel?myid=${id}">Activate</a>
      </body>
      </html>
      ` 
    };
    
    transporter.sendMail(mailOptions,(error, info)=>{
      if (error) {
        console.log(error);
    //    req.flash('noUser', { message:'something went wrong try again!' })
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
      }
    });
};
module.exports.suggestionMailer = (suggestion)=>{
    const transporter = nodemailer.createTransport({
    /*  host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "746d242333b2a4",
        pass: "93663e3aafe21d"
      }*/
  
      service: "gmail",
        auth: {
          user: "sumomessenger.beta@gmail.com",
          pass: process.env.mailer_pass
        } 
      
    });
  const mailOptions = {
      from: 'sumomessenger.beta@gmail.com',
      to: 'sumomessenger.beta@gmail.com' ,
      subject: 'Suggestion',
      html:`
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet"/>
      <style type="text/css" rel="stylesheet">
      ${style}
      </style>
      </head>
      <body>
      <h2 class="appname">SUMO suggestions</h2>
      <p>${suggestion}</p>
      </body>
      </html>
      ` 
    };
    
    transporter.sendMail(mailOptions,(error, info)=>{
      if (error) {
        console.log(error);
    //    req.flash('noUser', { message:'something went wrong try again!' })
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
      }
    });
};
module.exports.reportMailer = (email,report,link)=>{
    const transporter = nodemailer.createTransport({
      /*host: "smtp.mailtrap.io",
      port: 2525,
      auth: {
        user: "746d242333b2a4",
        pass: "93663e3aafe21d"
      }*/
  
      service: "gmail",
        auth: {
          user: "sumomessenger.beta@gmail.com",
          pass: process.env.mailer_pass
        } 
      
    });
  const mailOptions = {
      from:'sumo user',
      to:'sumomessenger.beta@gmail.com' ,
      subject: 'Error report',
      html:`
      <!DOCTYPE html>
      <html>
      <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet"/>
      <style type="text/css" rel="stylesheet">
      ${style}
      </style>
      </head>
      <body>
      <h2 class="appname">SUMO messenger</h2>
      <p class="name">from ${email},</p>
      <p>${report} <br>
      <small>link is ${link} </small>
      </p>
      </body>
      </html>
      ` 
    };
    
    transporter.sendMail(mailOptions,(error, info)=>{
      if (error) {
        console.log(error);
    //    req.flash('noUser', { message:'something went wrong try again!' })
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
      }
    });
}