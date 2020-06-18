const path = require("path");
const http = require('http');
const fs = require('fs');
//third party package imports
const express = require("express");
const app = express();
const server = http.createServer(app);
const bodyparser = require("body-parser");
//const upload = multer({dest: __dirname + '/models'})
const session = require("express-session");
const moongoose = require("mongoose");
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash');
const csrf = require('csurf');
const csrfProtection = csrf({cookie:true});
const morgan = require('morgan');
const helmet = require('helmet');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

//controller imports
const anonyrouter = require("./routes/anonyroutes");
const adminrouter = require("./routes/adminRoutes");
const errorController = require('./controllers/erros')
const isAuth = require('./utils/isAuth')
//models
const User = require("./models/user");
const uri = process.env.db;

//template engine configuration
app.set("view engine", "ejs");
app.set("views", "public/views");

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(cookieParser());
app.use((req,res,next)=>{
//this will allow no caching of our rendered files
res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
res.setHeader("Expires", "0");
next()
})
//session store initialization

app.use(
  session({
    secret: process.env.session_signing || 'iamdaddydom',
    resave: false,
    saveUninitialized: false,
    store:new MongoStore({ 
      url: process.env.session_store }) , 
      cookie:{
        maxAge:1000 * 60  //session will last for 3mins
      }, 
    })
);
//create write file stream
/*const logStream = fs.createWriteStream(path.join(__dirname,'access.log'),{
  flags:'a'
}) */

app.use(flash());
app.use(csrfProtection);
app.use(helmet())
//app.use(morgan('combined',{stream:logStream}))

//middleare for serving static files
app.use(express.static(path.join(__dirname, "/", "public")));
app.use(express.static(path.join(__dirname, "/", "assets")));
//routers for user and admin
app.use((req,res,next)=>{
  const tokID = req.cookies['sumo.toks'];
  try{
  if(tokID && tokID.length > 1 && !req.session.user){
  let decoded;
     decoded = jwt.verify(tokID,process.env.signMeToken);
    const userToken = decoded.ref
    User.findOne({userToken:userToken})
    .then(user=>{
      req.session.isauth = true;
      req.session.isVerfied = true;
      req.session.user = user;
      res.clearCookie('sumo.toks');
      res.cookie('sumo.toks', tokID, { maxAge:1000*60*60, httpOnly: true });
      req.session.save(()=>{
        next()
      })
    })
    }
  else{
    next()
  }
}catch(err){
  if(err.name === 'JsonWebTokenError'){
    res.clearCookie('sumo.toks');
    return res.redirect('/getstarted');
  }
  next()
}
})
app.post('/upload',isAuth,(req, res) => {
require('./controllers/upload').uploader(req,res)
});
app.post('/report',require('./utils/auth'),errorController.reportError)
app.post('/suggest',errorController.suggest)
app.use("/admin", adminrouter);
app.use("/", anonyrouter);
app.get('/500',(req,res,next)=>{
  res.render('techError',{
    csrfToken: req.csrfToken(),
  })
})
//express error middleware
app.use((err,req,res,next)=>{
 console.log(err)
 if(err.message === 'invalid csrf token'){
   return res.redirect('/500')
 }
   res.redirect('/500')
}) 
//404 page not found middleware
app.use(errorController.get404)
//server.listen(process.env.PORT || 3000 );
//require("./socket").init(server);

moongoose
  .connect(uri,{useNewUrlParser:true,useUnifiedTopology:true})
  .then((_) => {
    server.listen(process.env.PORT || 3000 );
    require("./socket").init(server); //socket server initialization
   console.log('connect') 
  }) 
  .catch((err) => {
   throw err
  });

   
