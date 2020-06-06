module.exports = (req,res,next) => {
    if(!req.session.isauth){
        return res.json({
            error:'user is not authenticated'
        })
    }
    next();
}