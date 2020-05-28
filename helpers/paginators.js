module.exports.chatPaginator = (req, res, next) => {
    const chats = !req.session.user.isAnonymous ? req.session.user.chats : req.session.user.anonyChats;
    const page = +req.query.page || 2
    const fid = req.body.fid
    const userChats = chats.find(chat => chat.chatId.toString() === fid.toString())
    if (userChats) {
        const messages = userChats.messages;
        if ((messages.length) > 10) {
            let start = messages.length - (10 * page)
            start = start < 0 ? 0 : start
            const end = messages.length - (10 * (page - 1))
                if (page > 1 && start > 0) {
                    return res.json(
                        {
                            messages: messages.slice(start, end),
                            next: page + 1
                        }
                    )

                }else if(end !== 0 && end > 0 &&page > 1){
                    return res.json(
                        {
                            messages: messages.slice(0, end),
                            next: page + 1
                        }
                    )
                }
        }
    }

}