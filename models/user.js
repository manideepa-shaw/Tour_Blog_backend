const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')

const Schema = mongoose.Schema

const userSchema = new Schema({
    name:{
        type: String,
        required: true
    },
      email:{
        type: String,
        required: true,
        unique:true
      },
      password:{
        type: String,
        required: true,
        minlength : 8
      },
      image:{
        type:String,
        required : true
      },
    places:[{
      type: mongoose.Types.ObjectId,
      required: true,
      ref:'Place'
    }]
})

userSchema.plugin(uniqueValidator) //this will make sure that the emails entered are unique and have not been entered before. We need to install this explicitly

//this 'User' will be the name of the collection as well but as 'users' //implicitly
module.exports = mongoose.model('User',userSchema)