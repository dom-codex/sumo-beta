module.exports.chatPaginator = (req, res, next) => {
    const chats = !req.session.user.isAnonymous ? req.session.user.chats : req.session.user.anonyChats;
    const page = +req.query.page || 2
    const fid = req.body.fid
    const userChats = chats.find(chat => chat.chatId.toString() === fid.toString())
    if (userChats) {
        const messages = userChats.messages;
        if ((Math.ceil((messages.length) / 10) >= page)) {
            let start = messages.length - (10 * page)
            start = start < 0 ? 0 : start
            const end = messages.length - (10 * (page - 1))
                if (page > 1 && start > 0) {
                    return res.json(
                        {
                            messages: messages.slice(start, end),
                            next: page + 1,
                            code:200
                        }
                    )
                }else{
                    return res.json(
                        {
                            messages: messages.slice(0, end),
                            next: page + 1,
                            code:200
                        }
                    )
                }
        }else{
            return res.json({
                code:301
            })
        }
    }

}