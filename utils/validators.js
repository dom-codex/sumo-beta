module.exports.comfirmNewUserName = (name)=>{
    if(name !== undefined && name !== null){
        return true;
    }else{
        const err = new Error('name field cannot be empty');
        throw err;
    };

};
module.exports.comfirmNewUserPhone = (phone)=>{
    if(phone === '') return true;
    else if(phone !== undefined &&
         phone !== null && 
         phone !== ' '){
        return true;
    }
    else
    {
        const error = new Error('enter a valid phone number');
        throw error;
    };

};
module.exports.comfirmNewUserEmail = (email)=>{
    email.toString();
    if(email !== undefined && email !==null ){
        return true;
    }else{
        const error = new Error('email field cannot be empty');
        throw error;
    };
};
module.exports.comfirmNewUserPassword = (pwd,req)=>{
    const {cpwd} = req.body;
    pwd.toString();
    cpwd.toString();
    if(pwd === undefined || pwd === null){
        const error = new Error('invalid password');
        throw error;
    }else if(pwd === ''){
        const error = new Error('password cannot be empty');
        throw error;
    }else if(pwd !== cpwd){
        const error = new Error('passwords do not match');
        throw error;
    }
    else{
        return true;
    };
};
module.exports.assertLoginCredentials = (pwd)=>{
    if(pwd === undefined || pwd === null){
        const error = new Error('invalid password');
        throw error;
    }else if(pwd === ''){
        const error = new Error('password cannot be empty');
        throw error;
    }
    else{
        return true;
    };
};
