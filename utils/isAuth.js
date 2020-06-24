module.exports = (req,res,next) => {
    if(req.session.isauth){
        if(req.session.isVerified){
            next();
    }else{
        return res.json({
            code:300,
            error:'user is not yet authorized'
        });
    };
    }else{
        return res.json({
            code:300,
            error:'user is not authenticated'
        });
    };
};