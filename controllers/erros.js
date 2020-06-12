const mailer = require('../utils/mailer')
module.exports.get404 = (req,res,next)=>{
    res.render('pageNotFound');
}
module.exports.reportError = (req,res,next)=>{
const email = req.body.email;
const link = req.body.link;
const report = req.body.report
    mailer.reportMailer(req.session.user.email,report,link)
    res.redirect('/')
}
module.exports.suggest = (req,res,next)=>{
    const suggestion = req.body.suggestion;
    mailer.suggestionMailer(suggestion)
    req.flash('saved', true)
    req.session.save(()=>{
        res.redirect('/')
    })

}