const nodemailer = require('nodemailer');
module.exports.mailer = (req,res,email,name,link)=>{
  const headUrl = process.env.urlHead || `http://localhost:3000`
    const transporter = nodemailer.createTransport({
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
        res.redirect('/resetpassword')
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
       req.flash('success',true)
       res.redirect('/resetpassword')
      }
    });
}