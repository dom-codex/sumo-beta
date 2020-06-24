const User = require('../models/user');
module.exports.profileAnonymous = (req,res,next,img)=>{
const page = +req.query.page || 1;
let ntotalOpenUsers;
let chatids;
let me;
    User.findById(req.session.user._id)
        .then((user) => {
          me = user;
          //filter out open chats id
          const chatid = user.anonyChats.map((id) => {
            return id.chatId;
          });
        //initialize the somewhat global variable
          chatids = chatid;
          return chatid;
        })
        .catch(err => {
          throw err;
        })
        .then(_=> {
          //get a of users the user  openly chat with
          return User.find({ _id: { $in: chatids } }).countDocuments();
        }).catch(err => {
          throw err;
        })
        .then(nOpenUsers => {
          ntotalOpenUsers = nOpenUsers;
          return;
        }).catch(err => {
          throw err;
        })
        .then(_ => {
          /*retrieve actual users we chatted with but limiting
          the no of records returned based on a chosen
          filtering condition i.e max of 2 users per page
           */
          User.find({ _id: { $in: chatids } })
          .sort({ $natural: -1 })
          .skip((page - 1) * 2)
            .limit(2)
            .then(openchats => {
              /*retrive users that chatted with user anonymously
              limiting the records returned by a chosen preference */
                  //render profile view with data to aid the display of users
                  //and actual pagination
                  //retrieve flash message
                  const error = req.flash('error');
                  const succes = req.flash('success');
                  let errors;
                  let success;
                  if (error.length > 0) {
                    errors = error[0];
                  };
                  if (succes.length > 0) {
                    success = succes[0];
                  };
                  req.toks ? res.cookie('sumo.toks', req.toks, { maxAge:1000*60*60, httpOnly: true }) :'';
        
                  res.render("profile", {
                    user: me,
                    img:img,
                    chats: [],
                    current: page,
                    hasNext: 2 * page < ntotalOpenUsers,
                    hasPrev: page > 1,
                    next: page + 1,
                    prev: page - 1,              
                     anonymous:me.isAnonymous?true:false,
                    errors: errors ? errors : { field: '', message: '' },
                    success: success ? success : { message: '' },
                    total: 0//ntotalOpenUsers,
                  });
                })
                .catch(err => {
                  next(err);
                })
            })
            .catch(err => {
              next(err);
            })//end of open chat then
        .catch((err) => {
          next(err);
        });
    };