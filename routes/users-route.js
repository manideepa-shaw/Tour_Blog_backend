// const express = require('express')
// const { check, validationResult} = require('express-validator')
// const {v4 : uuidv4} = require('uuid') //v4 is the version

// const route=express.Router()

// const user=[
//     {
//       name:"Striver",
//       id:"u1",
//       email:"xyz@gmail.com",
//       password:"Striver"
//     },
//     {
//       name:"Aish Rai",
//       id:"u2",
//       email:"email.com",
//       password:"Hello"
//     },
//     {
//       name:"Mukesh Ambani",
//       id:"u3",
//       email:"J@gmail.com",
//       password:"XYZ"
//     }
//   ]
// route.get('/',(req,res,next)=>{
//     res.status(200).json({users : user})
// })

// route.post('/signup',
// [
//     check('name').not().isEmpty(),
//     check('email').isEmail().normalizeEmail(),
//     check('password').isStrongPassword({
//         minLength: 8 ,
//         minLowercase: 1,
//         minUppercase:1,
//         minNumbers:1,
//         minSymbols:1
//       })
// ],(req,res,next)=>{
//     // extra lines of codee when using external validator
//     const error = validationResult(req)
//     if(!error.isEmpty())
//     {
//         console.log(error)
//         const err=new Error('Please Check youur data')
//         err.code=422
//         return next(err)
//     }
//     //
//     const {name , email, password}=req.body
//     const findUser = user.find(p => p.email===email)
//     if(findUser)
//     {
//         const err=new Error('User already exists!')
//         err.code=422
//         return next(err)
//     }
//     const newuser = {
//         name,
//         email,
//         password,
//         id:uuidv4()
//     }
//     user.push(newuser)
//     res.status(200).json({message:"User Signup successfull", users: user})
// })

// route.post('/login',(req,res,next)=>{
//     const {email, password}=req.body
//     const findUser = user.find(p => p.email===email)
//     if(!findUser)
//     {
//         const err = new Error("User not Found!")
//         err.code=404
//         next(err)
//     }
//     else{
//         if(findUser.password!=password)
//         {
//             const err = new Error("Incorrect password!")
//             err.code=404
//             return next(err)
//         }
//         res.status(200).json({message : "Logged In!"})
//     }
// })

// module.exports=route

// mongoose logic
const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/user')
const {v4 : uuidv4} = require('uuid')
const { check, validationResult, ExpressValidator} = require('express-validator')
const bcrypt = require('bcryptjs')
const fileUpload = require('../middleware/file-upload')

const route=express.Router()

route.get('/',async(req,res,next)=>{
    let users;
    try{
        users = await User.find({},'-password') //this will not display the password
    }
    catch(error){
        const err = new Error('Couldnot fetch users')
        err.code=500
        return next(err)
    }
    res.status(200).json({users : users.map((u)=> u.toObject({ getters : true }) )})
})

route.post('/signup',
fileUpload.single('image'),   //using multer
[
    check('name').not().isEmpty(),
    check('email').isEmail().normalizeEmail(),
    check('password').isStrongPassword({
        minLength: 8 ,
        minLowercase: 1,
        minUppercase:1,
        minNumbers:1,
        minSymbols:1
      })
],
async(req,res,next)=>{
    // extra lines of codee when using external validator
    const error = validationResult(req)
    if(!error.isEmpty())
    {
        console.log(error)
        const err=new Error('Please Check youur data')
        err.code=422
        return next(err)
    }
    //
    
    const {name , email, password}=req.body
    let existingUser;
    try{
        existingUser = await User.findOne({ email : email })
        console.log(existingUser)
    }
    catch(error)
    {
        const err=new Error('Signing Up failed! Try again later!')
        err.code=500
        return next(err)
    }
    if(existingUser)
    {
        const err=new Error('Email already exists! Please login.')
        err.code=422
        return next(err)
    }
    let hashedPassword ;
    try
    {
        hashedPassword = await bcrypt.hash(password, 12)//12 is the number of salting round
    }
    catch(err)
    {
        const error = new Error('Could not create user!')
        error.code=500
        return next(error)
    }
    const newuser = new User({
        name,
        email,
        password : hashedPassword,
        image: req.file.path,
        places:[]
    })
    try{
        await newuser.save(newuser)
    }
    catch(error)
    {
        console.log(error)
        const err=new Error('Signing Up failed! Try again later!')
        err.code=500
        return next(err)
    }
    // jwt 
    let token;
    try
    {
        token=jwt.sign({userId : newuser.id, email : newuser.email},
            'myprivatekey',
            {expiresIn : '1hr'}) //sign returns a string in the end and this will be the generated token 
        //the first argument of this sign is the payload i.e.,  the data that we want to encode into the token
    }
    catch(error)
    {
        console.log(error)
        const err=new Error('Signing Up failed! Try again later!')
        err.code=500
        return next(err)
    }

    // res.status(200).json({message:"User Signup successfull",
    // user: newuser.toObject( { getters:true },'-password' ) })

    res.status(200).json({userId: newuser.id, email : newuser.email, token:token})
})

route.post('/login',async(req,res,next)=>{
    const {email, password}=req.body
    let existingUser;
    try{
        existingUser = await User.findOne({ email : email })
        console.log(existingUser)
    }
    catch(error)
    {
        const err=new Error('Logging In failed! Try again later!')
        err.code=500
        return next(err)
    }
    if(!existingUser)
    {
        const err = new Error("User not Found!")
        err.code=404
        next(err)
    }
    else{
        let isValidPassword;
        // x=await bcrypt.hash(password, 12)
        // console.log(x,existingUser.password)
        try
        {
            isValidPassword = await bcrypt.compare(password, existingUser.password)
        }
        catch(err)
        {
            const error = new Error("Could not log you in! Some error occured")
            error.code=500
            return next(error)
        }
        if(!isValidPassword)
        {
            const err = new Error("Incorrect password!")
            err.code=404
            return next(err)
        }

        // jwt 
        let token;
        try
        {
            token=jwt.sign({userId : existingUser.id, email : existingUser.email},
                'myprivatekey',
                {expiresIn : '1hr'}) //sign returns a string in the end and this will be the generated token 
            //the first argument of this sign is the payload i.e.,  the data that we want to encode into the token
        }
        catch(error)
        {
            console.log(error)
            const err=new Error('Could not log you in! Some error occured')
            err.code=500
            return next(err)
        }

        // res.status(200).json({message : "Logged In!", 
        // user: existingUser.toObject( { getters:true } )})

        res.status(200).json({userId: existingUser.id, email : existingUser.email, token:token})
    }
})

module.exports=route