module.exports.requestFilter = (requests,User,cb)=>{
//retrieve ids of requesters
let openRequests;
let anonymousRequesters;

const ids = requests.map(r=>{
    return r.requester
})
//retrive open requesters
User.find({_id:{$in:ids}}).select('name images _id desc isAnonymous')
.then(openRequesters=>{
    openRequests = openRequesters.map(r=>{
        return {
            name:r.name,
            id:r._id,
            img:r.images.open.thumbnail,
            view:r.images.open.link,
            desc:r.desc,
            isAnonymous:false
        }
    });
    return User.find({anonyString:{$in:ids}})
})
.then(anonymousRequests=>{
  anonymousRequesters = anonymousRequests.map(r=>{
      return {
          name:r.anonymousName,
          id:r.anonyString,
          img:r.images.anonymous.thumbnail,
          view:r.images.anonymous.link,
          desc:'anonymous user',
          isAnonymous:true
      }
  });
  cb([...openRequests,...anonymousRequesters])
})
}