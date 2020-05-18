const http = require('http');
const path = require('path');

const express = require("express");
const app = express();
const server = http.createServer(app);

app.use((req,res,next)=>{
//this will allow no caching of our rendered files
res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
res.setHeader("Expires", "0");
next()
})
//middleware for serving static files
app.use(express.static(path.join(__dirname, "/", "assets")));

server.listen(3000)

   
