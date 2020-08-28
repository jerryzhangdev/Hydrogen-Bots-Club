const http = require("http")
const https = require("https")
const fs = require("fs")
const request = require("request")

let quickdb = require("quick.db")
let approval = new quickdb.table("approval")
let api = new quickdb.table("api")
let bots = new quickdb.table("bots")
let serverc = new quickdb.table("serverc")
const path = require("path")

const express = require("express")
let app = express()

https.createServer({
    cert: fs.readFileSync('./cert.pem')
  }, app)
  .listen(443);
  
  let server = http.createServer({
  cert: fs.readFileSync('./cert.pem')
  }, app)
  .listen(80);
  function isNumeric(num){
    return !isNaN(num)
  }
  
  app.post('/api/v1/servercount', (req, res) => {
    let token = req.header('Authorization')
    let servercount = req.header('guildcount')

    if(isNumeric(servercount) === false)return res.status(500).json({ error: true, message: "500 Internal Server Error: servercount must be a number!" })

    if(!token || !servercount)return res.status(404).json({ error: true, message: "404 Not Found: One of the requred headers was not found" })
    if(api.has(token) === false)return res.status(401).json({ error: true, message: "401 Unauthorized: Header Authorization Token Invalid" })
    
    bots.set(`${api.get(token).id}.guildcount`, servercount)
    bots.set(`${api.get(token).id}.apitoken`, token)

    res.status(200).json({ success: true })
})


  let rs = require("random-string")
const { pid } = require("process")
  
  
  app.post('/api/v1/obtaintoken/:id', (req, res) => {

    
    let options = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/@me',
        'headers': {
          'Authorization': 'Bearer ' + req.params.auth,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      request(options, async function (error, response) {
    var x = rs({length: 24});
    for(i in api.all()){
        if(api.all()[i] !== undefined){
        let data = JSON.parse(api.all()[i].data)
        console.log(data)
        if(data.id === req.params.id){
            api.delete(api.all()[i].ID)
        }
    }
        }

        api.set(x, { id: req.params.id })
    res.json({ error: false, code: x })

      })
    
  })


app.get('/', async function (req, res) {
  res.send("We apology for this, but we are currently down for maintenance! Please comeback in a few moments!")
})