import express from "express"
import dns from "dns"
import authRouter from "./routes/auth.route"
import cookieParser from "cookieparser"

dns.setServers(["0.0.0.0","1.1.1.1"])

const app = express()

app.use(express.json())
app.use(cookieParser())

app.use("/api/auth",authRouter)





export default app