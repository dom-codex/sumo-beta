module.exports = (req,res,next) => {
    if(!req.session.isauth && 
        !req.session.user && 
        !req.session.isVerified){
        return res.redirect('/getstarted')
    };
    next()
}