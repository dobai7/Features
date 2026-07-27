pehle folder structure banaya
    1. src/config
          /controllers
          /models
          /routes
          /app.js
    2. server.js and all
    3. .env
    4. .gitignore

npm i express mongoose jsonwebtoken dotenv nodemon express-validator cookieparser kara 

then server set kara 
then data base set kara 
  files banaye jese config me database.js and index .js config env ke liye 
  then
  import mongoose from "mongoose";
import config from "./index.js"

const connectDB = async ()=>{
  await mongoose.connect(config.MONGO_URI)
  console.log("Database Connected")  
}

export default connectDB

then server .js me ja kar connectDB ye run kar di ,
phase one end hei 

next ka kam hei ki api banana 

for register, login, logout, logout all , get me etc

starting with login 
these are some steps that we can follow to create register api 
"
Register API Steps
Request Receive Karo
Client se data aayega.
Example:
name
email
password
Input Validation
Check karo saare required fields aaye hain ya nahi.
Email valid format me hai ya nahi.
Password minimum length ka hai ya nahi.
Check Existing User
Database me email search karo.
Agar email pehle se hai to register mat hone do.
Response: "User already exists."
Password Hash Karo
Plain password kabhi database me store mat karo.
Password ko hash karo.
Create User Object
Name
Email
Hashed Password
Aur jo bhi default fields hain (role, avatar, etc.)
Save User
User document ko MongoDB me save karo.
Generate Tokens (Agar Login After Register Karwana Hai)
Access Token generate karo.
Refresh Token generate karo.
Refresh Token Store Karo
Agar tum alag RefreshToken collection use kar rahe ho to:
userId
refreshToken
userAgent
ipAddress
expiresAt
save karo.
Cookie Set Karo
Refresh token ko HttpOnly cookie me bhejo.
Access token response me bhej sakte ho ya cookie me (tumhare architecture par depend karta hai).
Success Response
201 Created
User details (password kabhi mat bhejna)
Access Token (agar use kar rahe ho)
Overall Flow
Client
   │
   ▼
Receive Data
   │
   ▼
Validate Input
   │
   ▼
Email Exists?
   │
 ┌─Yes────────► Error
 │
 No
 │
 ▼
Hash Password
 │
 ▼
Create User
 │
 ▼
Save User
 │
 ▼
Generate Tokens
 │
 ▼
Store Refresh Token
 │
 ▼
Set Cookie
 │
 ▼
201 Success

"

