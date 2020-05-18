module.exports.comfirmNewUserName = (name)=>{
    if(name !== undefined && name !== null && name.length>3){
        return true
    }else{
        const err = new Error('name field cannot be empty');
        throw err;
    }

}
module.exports.comfirmNewUserPhone = (phone)=>{

    if(phone !== undefined && phone !== null && phone !== ' ' && phone.length >= 11){
        return true
    }
    else
    {
        const error = new Error('enter a valid phone number')
        throw error;
    }

}
module.exports.comfirmNewUserEmail = (email)=>{
    email.toString();
    if(email !== undefined && email !==null ){
        return true
    }else{
        const error = new Error('email field cannot be empty')
        throw error;
    }
}
module.exports.comfirmNewUserPassword = (pwd,req)=>{
    const {cpwd} = req.body
    pwd.toString();
    cpwd.toString()
    if(pwd !== undefined && pwd !==null && pwd !== '' && pwd.length >= 5 && pwd === cpwd){
        return true
    }else{
        const error = new Error('invalid password')
        throw error;
    }
}
module.exports.assertLoginCredentials = (pwd)=>{
    if(pwd !== undefined && pwd !==null && pwd !== '' && pwd.length >5){
        return true
    }else{
        const error = new Error('invalid password')
        throw error;
    }
}
