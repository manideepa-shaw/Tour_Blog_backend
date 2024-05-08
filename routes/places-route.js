const express = require('express')
const mongoose = require('mongoose')
const { check,validationResult } = require('express-validator')
const {v4 : uuidv4} = require('uuid') //v4 is the version
const getCoordsForAddress = require('../utils/location')
const Place = require('../models/place')
const User = require('../models/user')
const fs = require('fs')
const fileUpload = require("../middleware/file-upload")
const checkAuth = require('../middleware/check-auth')


const route=express.Router()

route.get('/:pid',async (req,res,next)=>{
    // console.log("GET request in places")
    // const f = place.filter((p)=>{ return p.id==req.params.pid })
    // if(!f.length)
    // {
    //   const err = new Error("Place Id Not Fount")
    //   err.code=404;
    //   return next(err) //use return or else next lines may also get executed or use else block
    //   // return res.status(404).json({"message":"Place Id Not Fount"})
    // }

    // mongoose here
    let findplace;
    try{
      findplace = await Place.findById(req.params.pid)
    }
    catch(err)
    {
      console.log(err)
      const error = new Error('Somethiong went wrong. Could not find the place')
      error.code = 500
      return next(error)
    
    }
    if(!findplace)
    {
      const err = new Error("Place Id Not Fount")
      err.code=404;
      return next(err) //use return or else next lines may also get executed or use else block
    }

    // res.status(200).json({findplace})
    // now since we are usiung mongoose this place object is a mongoose object and not JS object
    // so to make it easier to use in JS we are using toObject and to convert _id to id we are using getters  
    res.status(200).json({findplace : findplace.toObject({getters : true})})
})
route.get('/user/:userId',async(req,res,next)=>{
    // const places=place.filter((p)=>{
    //     return p.creator===req.params.userId
    // })
    let places;
    // mongoose
    try{
      places = await Place.find({creator : req.params.userId})
    }
    catch(err)
    {
      const error = new Error('Somethiong went wrong. Could not find the place')
      error.code = 500
      return next(error)
    }
    if(places.length)
    {
      // since find returns an array of mongoose objects
        res.status(200).json({ places : places.map( p => p.toObject({getters : true}) )})
    }
    else{
      const err=new Error("No such user exists!")
      err.code=404
      next(err)  //here i am not using return because it is in a if-else block
        // res.status(404)
        // res.end("<h1>No such user exists!</h1>")
    }
})

// to check if the post request that is being sent has a valid token that is the(only logged in user can send post request)

route.use(checkAuth)

//


// here we are using check to ensure that the inputs are not empty. We can even do it manually
//but this way the code looks cleaner
route.post('/',
fileUpload.single('image'),
[check('title').not().isEmpty(),
check('description').isLength({min:5}),
check('address').not().isEmpty(),
],
async(req,res,next)=>{
  const error = validationResult(req)
  if(!error.isEmpty())
  {
    const err=new Error('Please Check youur data')
    err.code=422
    console.log(err)
    return next(err)
  }
  // const { title, description, address, creator} = req.body;
  const { title, description, address} = req.body;
  try
  {
    coordinates= await getCoordsForAddress(address)
    // console.log(coordinates)
  }
  catch(error)
  {
    console.log("Coordinate problem")
    return next(error)
  }
  
  const createdPlace = new Place({
    title,
    description,
    location: coordinates,
    address,
    creator: req.userData.userId,
    imageUrl: req.file.path
  })

  let findcreator;
  try{
    findcreator = await User.findById(req.userData.userId)
  }
  catch(err)
  {
    console.log(err)
    const error = new Error('Creating place failed! Please try again.')
    error.code=500
    return next(error)
  }
  if(!findcreator)
  {
    console.log(findcreator)
    const error = new Error('User doesnot exist');
    error.code=404
    return next(error)
  }

  // place.push(createdPlace)
  try{
    // await createdPlace.save() //mongo line

    // now we will be using the concept of sessions to insert the logged in user as the creator
    const session = await mongoose.startSession()
    session.startTransaction()
    createdPlace.save({ session : session })
    findcreator.places.push(createdPlace) //this only adds the place ID
    await findcreator.save( { session : session })
    await session.commitTransaction()
  }
  catch(err){
    const error = new Error('Creating place failed! Please try again.')
    error.code=500
    return next(error)
  }

  res.status(200).json({place: createdPlace})
})

// node code

// route.patch('/:pid',
// [check('title').not().isEmpty(),
// check('description').isLength({min:5})
// ]
// ,(req,res,next)=>{  
//   // extra lines of codee when using external validator
//   const error = validationResult(req)
//   if(!error.isEmpty())
//   {
//     const err=new Error('Please Check youur data')
//     err.code=422
//     return next(err)
//   }
//   //
//   const { title, description }=req.body;
//   const placeId = req.params.pid
//   const updatedPlace = {...place.find(p => p.id === placeId)}
//   const placeIndex = place.findIndex( p=> p.id === placeId)
//   updatedPlace.title=title
//   updatedPlace.description=description

//   place[placeIndex] = updatedPlace

//   res.status(200).json({place : updatedPlace})
// })

// same when written in mongoose
route.patch('/:pid',
[check('title').not().isEmpty(),
check('description').isLength({min:5})
]
,async(req,res,next)=>{  
  // extra lines of codee when using external validator
  const error = validationResult(req)
  if(!error.isEmpty())
  {
    const err=new Error('Please Check youur data')
    err.code=422
    return next(err)
  }
  //

  // adding extra level of security so that nboone can edit some other personms datA from backend(postman) also
  let temp;
  try
  {
    temp = await Place.findById(req.params.pid)
  }
  catch(error)
  {
    const err=new Error('Could not find data')
    err.code=422
    return next(err)
  }
  if(temp.creator.toString()!==req.userData.userId)
  {
    const err=new Error('You are not authorized to edit this place')
    err.code=401
    return next(err)
  }
  // 

  const { title, description }=req.body;
  const placeId = req.params.pid
  let updatedPlace;
  try{
    await Place.findByIdAndUpdate(placeId, {title,description})
    updatedPlace = await Place.findById(placeId)
  }
  catch(error)
  {
    const err=new Error('Could not update data')
    err.code=422
    return next(err)
  }
  res.status(200).json({place : updatedPlace})
})

// node

// route.delete('/:pid',(req,res,next)=>{
//   const findplace = place.find( p => p.id===req.params.pid)
//   if(!findplace)
//   {
//     const err = new Error("Place cannot be deleted since not found")
//     err.code=404
//     return next(err)
//   }
//   place = place.filter( p => {return p.id!=req.params.pid})
//   res.status(200).json({message : "Deleted place"})
// })

// mongoose
route.delete('/:pid',async(req,res,next)=>{
  let findplace;
  try{ 
    findplace = await Place.findById(req.params.pid).populate('creator')
   }
  catch(error)
  {
    const err = new Error("Couldnot delete the place. Try again later!")
    err.code=404
    return next(err)
  }
  if(!findplace)
  {
    const err = new Error("Place cannot be deleted since not found")
    err.code=404
    return next(err)
  }

  // adding extra level of security so that nboone can edit some other personms datA from backend(postman) also
  //findplace.creator.id because we have getters
  if(findplace.creator.id!==req.userData.userId)
  {
    const err=new Error('You are not authorized to delete this place')
    err.code=401
    return next(err)
  }
  //

  // to clean the deleted places image
  const imagePath = findplace.imageUrl
  try{
    // we use transaction ans session because I need all these tasks to make changes only when all of them are executed 
    const session = await mongoose.startSession()
    session.startTransaction()
    await Place.findByIdAndDelete(req.params.pid,{ session : session })
    findplace.creator.places.pull(findplace) //this remove the place ID from the creator because its already populated
    await findplace.creator.save( { session : session })
    await session.commitTransaction()
  }
  catch(err)
  {
    const error = new Error('Could not delete the place')
    error.code = 500
    return next(error)
  }
  fs.unlink(imagePath, err => {
    console.log('Image not deleted!!!')
    console.log(err)
  })
  res.status(200).json({message : "Deleted place"})
})

module.exports = route;