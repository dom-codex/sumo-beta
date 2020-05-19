const Admin = require("../models/admin");
const User = require("../models/user");
const Suggestion = require("../models/suggestion");
const bcrypt = require("bcryptjs");
const moment = require("moment");

module.exports.adminAuthPage = (req, res, next) => {
  res.render("adminAuth");
};
//controller for creating an admin
module.exports.createAdmin = (req, res, next) => {
  //extract details from body
  const name = req.body.name;
  const password = req.body.pwd;
  const phone = req.body.phone;
  const email = req.body.email;
  bcrypt
    .hash(password, 12)
    .then((hash) => {
      const admin = new Admin({
        name: name,
        email: email,
        password: hash,
        phone: phone,
      });
      return admin.save();
    })
    .then((user) => {
      return res.redirect(`/admin/me/dashboard/${admin._id}`);
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.logAdmin = (req, res, next) => {
  const phone = req.body.phone;
  const password = req.body.pwd;

  Admin.findOne({ phone: phone })
    .then((admin) => {
      bcrypt.compare(password, admin.password).then((result) => {
        if (result) {
          const adminD = {
            _id: admin._id,
            phone: admin.phone,
          }
          req.session.admin = adminD
          req.session.save((err)=>{
            return res.redirect(`/admin/me/dashboard/${admin._id}`);
          })        
          //User.updateStatus(uid,'online')
        } else {
          //send flash message
          res.redirect("/admin/me");
        }
      });
    })
    .catch((err) => {
      next(err);
    });
};
module.exports.suggestion = (req, res, next) => {
  const suggestion = req.body.suggestion.toString();
  if (!suggestion) {
    return res.redirect("/");
  }
  //create new suggestion docs
  const newSuggestion = Suggestion({
    body: suggestion,
    time: moment().format("LT"),
  });
  return newSuggestion.save().then((_) => {
    req.flash('saved', true)
    res.redirect("/");
  });
};
module.exports.dashboard = (req, res, next) => {
  const id = req.params.id;
  //validate admin id
  Admin.findById(id)
    .then((admin) => {
      if (!admin) {
        return res.redirect("/admin/me");
      }
      return;
    })
    .catch((err) => {
      throw err;
    })
    .then((_) => {
      //variables to carry out pagination
      let nUsers;
      let nSuggestions;
      let suggestions;
      const uPage = +req.query.uPage || 1;
      const sPage = +req.query.sPage || 1;
      //get a count of total users
      User.find()
        .countDocuments()
        .then((number) => {
          nUsers = number;
          return;
        })
        .then((_) => {
          //get a count of suggestion
          return Suggestion.find().countDocuments();
        })
        .then((num) => {
          nSuggestions = num;
          //extra validation
          return Admin.findOne({ phone:req.session.admin.phone })
          .then(
            (admin) => {
              if (!admin) {
                return res.redirect("/admin/me");
              }
              //retrieve suggestion based on some a chosen pagination rule
              return Suggestion.find()
                .skip((sPage - 1) * 2)
                .limit(2)
                .then((mysuggestions) => {
                  suggestions = mysuggestions;
                  //retrieve suggestion based on some a chosen pagination rule
                  return User.find()
                    .skip((uPage - 1) * 2)
                    .limit(2);
                })
                .then((users) => {
                  res.render("dashboard", {
                    uCurrent: uPage,
                    sCurrent: sPage,
                    uNext: uPage + 1,
                    sNext: sPage + 1,
                    uPrev: uPage - 1,
                    sPrev: sPage - 1,
                    uHasNext: 2 * uPage < nUsers,
                    sHasNext: 2 * sPage < nSuggestions,
                    uHasPrev: uPage > 1,
                    sHasPrev: sPage > 1,
                    uTotal: nUsers,
                    sTotal: nSuggestions,
                    suggestions: suggestions,
                    users: users,
                    id: id,
                  });
                });
            }
          ).catch(err=>{
            res.redirect('/admin/me')
          });
        });
    })
    .catch((err) => {
      res.redirect("/admin/me");
    });
};
module.exports.logout = (req,res,next)=>{
req.session.destroy(()=>{
  res.redirect('/admin/me')
})
}
module.exports.changePassword = (req, res, next) => {
  const oldPassword = req.body.old;
  const newPassWord = req.body.new;
  Admin.findById(req.session.admin._id)
    .then(admin => {
      bcrypt.compare(oldPassword, admin.password)
        .then(result => {
          if (!result) {
            return res.redirect(`/admin/me/dashboard/${req.session.admin._id}`);
            //send flash message that old password is incorrect
            //then reload page with the previously supplied data
          }
          bcrypt.hash(newPassWord, 12)
            .then(hash => {
              admin.password = hash
              admin.save().then(user => {
                res.redirect(`/admin/me/dashboard/${req.session.admin._id}`)
              }) //then of save()
            }) //then block of new hash

        })
    })
}