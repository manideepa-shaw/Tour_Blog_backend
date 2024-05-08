
// using multer for file upload in backend
const multer = require('multer')
const {v4 : uuidv4} = require('uuid')

const MIME_TYPE_MAP ={
    'image.png':'png',
    'image.jpg':'jpg',
    'image.jpeg':'jpeg'
}

const fileUpload = multer({
    limits:500000,
    storage: multer.diskStorage({
        // where the files will be stored
        destination: (req, file, cb)=>{
            cb(null,'uploads/images')
        },
        filename: (req, file, cb)=>{
            // cb is a callback function
            const ext = MIME_TYPE_MAP[file.mimetype]
            console.log("ext"+ext)
            cb(null, uuidv4() + '.' + 'jpg') //this will generate a random file name with right extension
        },
        // to check we donot get inValid inputs
        fileFilter: (req, file, cb)=>{
            // if we don't find any of the mimetypes in the MIME_TYPE_MAP then it will get converted to undefined. To cahnge undefined to false we are using !! 
            const isValid = !!MIME_TYPE_MAP[file.mimetype]
            let error = isValid ? null : new Error('Invalid Mime Type')
            cb(error, isValid)
        }
    })
})
module.exports = fileUpload