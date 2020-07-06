//helper middleware to take the user to their feed screen
//using  /userchannel route
var jwt = require('jsonwebtoken');
const User = require("../models/user");
module.exports = (req, res, next) => {
  const id = req.query.myid;
  const toks = req.query.ref;
  let decoded;
  if (
    req.session.user !== null &&
    req.session.user !== undefined &&
    req.session.isVerified &&
    req.session.isauth &&
    !req.session.user.isDeleted
  ) {
    return res.redirect(`/sumouser?su=${req.session.user._id}`);
  } else if (id !== undefined && id.length > 0) {
    //validate id
    try{
      decoded = jwt.verify(toks,process.env.signMeToken);
     }catch(err){
       if(err.name === 'JsonWebTokenError'){
          return res.redirect('/getstarted');
       };
     };
    User.findById(id)
      .then((user) => {
        if (user && decoded.toks == user.userToken) {
          user.isVerified = true;
          return user.save();
        } else {
          return res.redirect("/getstarted");
        };
      })
      .then((user) => {
        if (!user) {throw new Error();};
        const userToks = jwt.sign({ ref:decoded.toks },process.env.signMeToken);
        res.cookie('sumo.toks', userToks, { maxAge: 60*60*1000, httpOnly: true });
        req.session.isauth = true;
        req.session.user = user;
        req.session.isVerified = user.isVerified;
        req.session.save(() => {
          return res.redirect(`/sumouser?su=${user._id}`);
        });
      })
      .catch((e) => {});
  } else {
    return res.redirect("/getstarted");
  };
};