import mongoose from "mongoose";
import config from "./index.js"

const connectDB = async ()=>{
  await mongoose.connect(config.MONGO_URI)
  console.log("Database Connected")  
}

export default connectDB