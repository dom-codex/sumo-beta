module.exports = (req,res,next) => {
    if(!req.session.isauth){
        return res.redirect('/getstarted')
    }
    next();
}