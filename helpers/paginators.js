const Message = require('../models/messages')
module.exports.chatPaginator = (req, res, next) => {
    const page = +req.query.page || 1
    let totalMessages;
    const uid = req.body.uid
    const fid = req.body.fid
    let last;
    if(page <= 0) return
    Message.find({$or:[{$and:[{sender:uid},{receiver:fid}]},{$and:[{sender:fid},{receiver:uid}]}]}).countDocuments()
    .then(nMessages=>{
        totalMessages = nMessages
        last = (Math.ceil((totalMessages) / 10))
        if ((Math.ceil((totalMessages) / 10) >= last)){
         return Message.find({$or:[{$and:[{sender:uid},{receiver:fid}]},{$and:[{sender:fid},{receiver:uid}]}]})
        .sort({$natural:-1}).skip((page - 1) * 10).limit(10)
    }
    })
    .then(messages=>{
            if (messages) {
                return res.json(
                    {
                        messages: messages,
                        next: page + 1,
                        code:200
                    }
                )
}
    })
}