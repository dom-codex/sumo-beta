module.exports = (req,res,next)=>{
    if(req.session.user !== null && 
        req.session.user!== undefined &&
        req.session.isauth){
         return res.redirect(`/userchannel/${req.session.user._id}`)
        }
        return res.redirect('/login')
}