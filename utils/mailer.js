const nodemailer = require('nodemailer');
module.exports.mailer = (req,res,email,name,link)=>{
    const transporter = nodemailer.createTransport({
        host: "smtp.mailtrap.io",
        port: 2525,
        auth: {
          user: "746d242333b2a4",
          pass: "93663e3aafe21d"
        }
      
    });
  const mailOptions = {
      from: 'non-reply.sumo-beta@gmail.com',
      to: email,
      subject: 'Password reset',
      html:`
      <html>
      <head>
      <link href="https://fonts.googleapis.com/css?family=Rubik" rel="stylesheet"/>
      <style type="text/css" rel="stylesheet">
      *{
        font-family: Rubik
      }
      body{
        margin:15px 0 0 20px
    }
    .name{
        text-transform: uppercase;
   }
    .link{
        text-decoration: none;
        padding:10px;
        border-radius:5px;
        background-color: rebeccapurple;
        color:#fff
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
      <a class="link" href="localhost:3000/setnewpassword/${link}">Reset password</a>
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
      } else {
        console.log('Email sent: ' + info.response);
     //tell user to go to their in box and activate
     //the link
       req.flash('success',true)
       res.redirect('/resetpassword')
      }
    });
}