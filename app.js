const express = require('express')
const fs = require('fs')
const path=require('path')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const placesRoute = require('./routes/places-route')
const usersRoute = require('./routes/users-route')

const dotenv = require('dotenv');
dotenv.config();

const app=express()

app.use(bodyParser.json())

// for cors operation
app.use((req,res,next)=>{
    res.setHeader('Access-Control-Allow-Origin','*') //any browser can send the request
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PATCH, DELETE')
    next()
})

// middleware to handle images
app.use("/uploads/images",express.static(path.join('uploads','images'))) //express.static returns the requested file

app.use("/api/places",placesRoute)

app.use("/api/users",usersRoute)

// to handle all the not found page error, the routes that are not defined
app.use((req,res,next)=>{
    const error = new Error("Could not find this page!!!")
    error.code = 404
    return next(error)
})

app.use((err,req,res,next)=>{
    // to delete the images if user not successfully signed up
    if(req.file)
    {
        fs.unlink(req.file.path, (err)=>{
            console.log(err)
        })
    }

    // to check if the response has been sent to the header
    if(res.headerSent)
    {
        return next(err)
    }
    res.status(err.code || 500)
    res.json({message: err.message || "An unknown error occured"})
})
console.log(process.env.DB_USER)

// app.listen(5000)
mongoose.connect(`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.icxcrv1.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`)
.then(()=>{
    console.log('Connected')
    app.listen( process.env.PORT || 5000)
})
.catch((err)=>{
    console.log(err)
})