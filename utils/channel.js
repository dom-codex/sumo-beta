//helper middleware to take the user to their feed screen
//using  /userchannel route
const User = require('../models/user');
module.exports = (req,res,next)=>{
    const id = req.query.myid
    if(req.session.user !== null && 
        req.session.user!== undefined &&
        req.session.isauth){
         return res.redirect(`/userchannel/${req.session.user._id}`)
        }  else if(id !== undefined){
            //validate id
            User.findById(id)
            .then(user=>{
                if(user){
                req.session.isauth = true;
                req.session.user=user
                req.session.save(()=>{
                    return res.redirect(`/userchannel/${user._id}`)  
                })
                }else{
                return res.redirect('/getstarted')
            }
            })
        }else{
        return res.redirect('/getstarted')
    }
}