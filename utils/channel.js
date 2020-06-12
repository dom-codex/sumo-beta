//helper middleware to take the user to their feed screen
//using  /userchannel route
const User = require("../models/user");
module.exports = (req, res, next) => {
  const id = req.query.myid;
  if (
    req.session.user !== null &&
    req.session.user !== undefined &&
    req.session.isVerified &&
    req.session.isauth
  ) {
    return res.redirect(`/userchannel/${req.session.user._id}`);
  } else if (id !== undefined && id.length > 0) {
    //validate id
    User.findById(id)
      .then((user) => {
        if (user) {
          user.isVerified = true;
          return user.save();
        } else {
          return res.redirect("/getstarted");
        }
      })
      .then((user) => {
        if (!user) {throw new Error()};
        req.session.isauth = true;
        req.session.user = user;
        req.session.isVerified = true;
        req.session.save(() => {
          return res.redirect(`/userchannel/${user._id}`);
        });
      })
      .catch((e) => {});
  } else {
    return res.redirect("/getstarted");
  }
};
