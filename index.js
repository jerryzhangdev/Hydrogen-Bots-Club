const express = require("express")
const https = require("https")
const http = require("http")
const path = require("path")
const fs = require("fs")
const request = require("request")
let Discord = require("discord.js")
let quickdb = require("quick.db")
let approval = new quickdb.table("approval")
let api = new quickdb.table("api")
let bots = new quickdb.table("bots")
let serverc = new quickdb.table("serverc")
let news = new quickdb.table("news")
let userapi = new quickdb.table("userapi")
let client = new Discord.Client()
var health = require('express-ping');
let fetch = require("node-fetch")
let connected = {}
let app = express()

app.use(health.ping());
 
// The following 4 are the actual values that pertain to your account and this specific metric.
var apiKey = 'bebff5c4-ca2e-498c-bf3a-77a04e9e42e1';
var pageId = '73j41k5d94f8';
var metricId = 'l7mhmt8cnm6h';
var apiBase = 'https://api.statuspage.io/v1';
 
var url = apiBase + '/pages/' + pageId + '/metrics/' + metricId + '/data.json';
var authHeader = { 'Authorization': 'OAuth ' + apiKey, "content-type": 'application/json' };
 
// Need at least 1 data point for every 5 minutes.
// Submit random data for the whole day.
var totalPoints = 60 / 5 * 24;
var epochInSeconds = Math.floor(new Date() / 1000);
 
// This function gets called every second.
function submit(count) {
    
    request('{Your Website Hostname}ping', function (error, response, body) {
    count = count + 1;
   
    if(count > totalPoints) return;
   
  var totalPoints = 60 / 5 * 24;
  var epochInSeconds = Math.floor(new Date() / 1000);
    var currentTimestamp = epochInSeconds - (count - 1) * 5 * 60;
   
    var data = {
      "data": {
      "timestamp": currentTimestamp,
      "value": JSON.parse(body).resources.cpu[0].speed
      }
    };


        

    var options = { method: 'POST', headers: authHeader, body: JSON.stringify(data) };
  
    fetch(url, options)
    })
  }
 
// Initial call to start submitting data.
client.on("ready", () => {
    setInterval(function () {
        submit(0);
      }, 1000);
})

const limit = require('express-limit-master').limit;
app.use(express.static(__dirname));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + "/index.html"))
})

var schedule = require('node-schedule');

var j = schedule.scheduleJob('0 0 1 * *', function(){
    for(i in bots.all()){
        bots.set(`${bots.all()[i].ID}.upvoted`, [])
        console.log("Cleared!")
    }
});




app.get('/bot/add', (req, res) => {
    res.sendFile(path.join(__dirname + "/addbot.html"))
})

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/bot/add', (req, res) => {
    let posted = req.body
    let data;

    if(!posted.website){
    data = {
        clientid: posted.clientid,
        prefix: posted.prefix,
        shortdescription: posted.description,
        longdescription: posted.longdescription,
        supportserver: posted.supportserver,
        tag: posted.tag,
        invite: posted.invite,
        access_token: posted.access_token,
        downtime: true
    }
    }else if(posted.website){
        data = {
            clientid: posted.clientid,
            prefix: posted.prefix,
            shortdescription: posted.description,
            longdescription: posted.longdescription,
            website: posted.website,
            supportserver: posted.supportserver,
            tag: posted.tag,
            invite: posted.invite,
            access_token: posted.access_token,
            downtime: true
        }
    }

    let options = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/' + data.clientid,
        'headers': {
          'Authorization': 'Bot {Bot Token}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      let useroptions = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/@me',
        'headers': {
          'Authorization': 'Bearer ' + posted.access_token,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      request(options, async function (error, response) {
        let json = JSON.parse(response.body)
        if(json.id === null)return res.redirect("/bot/add?error=" + json.message)
        if(json.bot === false)return res.redirect("/bot/add?error=The_Client_ID_you've_provided_is_not_a_bot")
        if(approval.has(json.id) === true || bots.has(json.id) === true)return res.redirect("/bot/add?error=This_Bot_is_already_in_the_queue_or_in_the_list")

        request(useroptions, async function (error, userresponse) {
            let userjson = JSON.parse(userresponse.body)
            if(posted.website !== null){
                approval.set(data.clientid, { certified: false, shardcount:0, guildcount: 'N/A', upvoted: [], upvotes: 0, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, website: data.website, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }else if(posted.website === null){  
                approval.set(data.clientid, { certified: false, shardcount:0, guildcount: 'N/A', upvoted: [], upvotes: 0, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }
            
            let eta = approval.all().length * 30

            client.users.fetch(userjson.id).then(member => {
                let guild = client.guilds.cache.get('735303016168816652')
                if (guild.member(member.id)) {
                    member.send("Your bot, **__" + json.username + "#" + json.discriminator + "__** is now in the approval queue. Please be patient. Estimated time until approval: " + eta + " minutes")
                }else{
                    member.send("Your bot, **__" + json.username + "#" + json.discriminator + "__** is now in the approval queue. Please be patient. I have detected that you are not in our server yet! Please join our server because it is required for your bot to get approved. Join using {Your Website Hostname}discord. Estimated time until approval: " + eta + " minutes")
                }
            })

            

            let embed = new Discord.MessageEmbed()
                .setTitle(json.username + "#" + json.discriminator + "(" + json.id + ") has been added to the approval queue by " + userjson.username + "#" + userjson.discriminator)
                .setDescription("Estimated Approval Time: " + eta + " minutes")
                .setColor("PURPLE")
                .setFooter(approval.all().length-1 + " bots are in front of " + json.username)
                .setTimestamp();
            client.channels.cache.get("{Bot Logs Channel}").send("<@&735641595356905493>", embed)

            res.redirect("/bot/add?success=true")

    })

    })
    

})

app.get('/:user/bots', (req, res) => {
    let params = req.params.user;
    let data = []
    for(i in bots.all()){
        if(bots.all()[i].data.authorid === params){
            data.push(bots.all()[i].data)
        }
    }

    res.json(JSON.stringify(data))

})
app.get('/bots', (req, res) => {
    let data = []
    for(i in bots.all()){
            data.push(bots.get(bots.all()[i].ID))
    }

    res.json(JSON.stringify(data))

})

app.get('/bots/all', (req, res) => {
    res.sendFile(path.join(__dirname, './all.html'))

})

app.get('/bots/random', (req, res) => {
    let data = []
    for(i in bots.all()){
            data.push(bots.get(bots.all()[i].ID))
    }
    let bot = data[Math.floor(Math.random() * data.length)]
    res.json(JSON.stringify(bot))

})

app.get('/bot/:id', (req, res) => {
    res.sendFile(__dirname + "/" + "bots.html")

})

app.get('/approval/queue', (req, res) => {
    res.sendFile(__dirname + "/" + "approval.html")

})

app.get('/bot/:id/edit', (req, res) => {
    res.sendFile(__dirname + "/" + "edit.html")

})

app.get('/status', (req, res) => {
    res.redirect("https://joinhbc.statuspage.io")

})

app.post('/bots/edit/:botid', (req, res) => {
    let id = req.params.botid;
    let posted = req.body;
    let data;

    if(!posted.website){
    data = {
        clientid: id,
        prefix: posted.prefix,
        shortdescription: posted.description,
        longdescription: posted.longdescription,
        supportserver: posted.supportserver,
        tag: posted.tag,
        invite: posted.invite,
        access_token: posted.access_token,
        downtime: posted.downtime
    }
    }else if(posted.website){
        data = {
            clientid: id,
            id: id,
            prefix: posted.prefix,
            shortdescription: posted.description,
            longdescription: posted.longdescription,
            website: posted.website,
            supportserver: posted.supportserver,
            tag: posted.tag,
            invite: posted.invite,
            access_token: posted.access_token,
            downtime: posted.downtime
        }
    }

    let options = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/' + data.clientid,
        'headers': {
          'Authorization': 'Bot {Bot Token}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      let useroptions = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/@me',
        'headers': {
          'Authorization': 'Bearer ' + data.access_token,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      request(options, async function (error, response) {
        let json = JSON.parse(response.body)
        if(json.id === null)return res.redirect("/bot/add?error=" + json.message)
        if(json.bot === false)return res.redirect("/bot/add?error=The_Client_ID_you've_provided_is_not_a_bot")

        request(useroptions, async function (error, userresponse) {
            let userjson = JSON.parse(userresponse.body)
            if(approval.has(id) === true){
            if(posted.website !== null){
                approval.set(id, { webhook: posted.webhook, downtime: posted.downtime, shardcount: bots.get(id).shardcount, guildcount: bots.get(id).guildcount, upvoted: bots.get(id).upvoted, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, website: data.website, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }else if(posted.website === null){
                approval.set(id, { webhook: posted.webhook, downtime: posted.downtime, shardcount: bots.get(id).shardcount, guildcount: bots.get(id).guildcount, upvoted: bots.get(id).upvoted, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }
        }else if(bots.has(id) === true){
            if(posted.website !== null){
                bots.set(id, { webhook: posted.webhook, certified: bots.get(id).certified, shardcount: bots.get(id).shardcount, guildcount: bots.get(id).guildcount, upvoted: bots.get(id).upvoted, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, website: data.website, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }else if(posted.website === null){
                bots.set(id, { webhook: posted.webhook, certified: bots.get(id).certified, shardcount: bots.get(id).shardcount, guildcount: bots.get(id).guildcount, upvoted: bots.get(id).upvoted, locale: userjson.locale, authorid: userjson.id, authorusername: userjson.username, authordiscriminator: userjson.discriminator, authoravatarurl:`https://cdn.discordapp.com/avatars/${userjson.id}/${userjson.avatar}.png`, invite: data.invite, tag: data.tag, supportserver: data.supportserver, longdescription: data.longdescription, description: data.shortdescription, prefix: data.prefix, id: data.clientid, avatarurl: `https://cdn.discordapp.com/avatars/${json.id}/${json.avatar}.png`, username: json.username, discriminator: json.discriminator,  })
            }
        }

            


            let embed = new Discord.MessageEmbed()
                .setTitle(json.username + "#" + json.discriminator + "(" + json.id + ") has been edited by " + userjson.username + "#" + userjson.discriminator)
                .setDescription("This is a certified edit.")
                .setColor("YELLOW")
                .setTimestamp();
            client.channels.cache.get("{Bot Logs Channel}").send("<@" + bots.get(id).authorid + ">", embed)

            res.redirect("/bot/" + json.id + "?editsuccess=true")

            const invalidprefix = ['-', '!', '@', '#', '<', '>', '[', ']', '{', '}', '(', ')']
          if(invalidprefix.includes(data.prefix) === true){
            let options = {
                'method': 'PUT',
                'url': `https://discordapp.com/api/guilds/735303016168816652/members/${data.id}/roles/735652144035921950`,
                'headers': {
                  'Authorization': 'Bot NzM1MjIwMTAxNzE2MTE1NTM3.XxjMBg.47IuJrnxicJJo9t-bNpwgmsl8HM',
                  'Content-Type': 'application/json'
                }
              }
        
              
        
              request(options, async function (error, response){
                  console.log("Mute Role Applied: common prefix")
              } )
          }else{
            let options = {
                'method': 'DELETE',
                'url': `https://discordapp.com/api/guilds/735303016168816652/members/${data.id}/roles/735652144035921950`,
                'headers': {
                  'Authorization': 'Bot NzM1MjIwMTAxNzE2MTE1NTM3.XxjMBg.47IuJrnxicJJo9t-bNpwgmsl8HM',
                  'Content-Type': 'application/json'
                }
              }
        
              
        
              request(options, async function (error, response){
                  console.log("Mute Role Removed: common prefix")
              } )
          }

    })
    })

})

app.get('/bots/:id', (req, res) => {
    let id = req.params.id
    
    res.json(bots.get(id))

})

app.get('/bots/:id/queue', (req, res) => {
    let id = req.params.id

    res.json(approval.get(id))

})

app.get('/botqueue', (req, res) => {

    
    let data = []
    
    for(i in approval.all()){
        if(approval.has(JSON.parse(approval.all()[i].data).id) === true){
            if(bots.get(JSON.parse(approval.all()[i].data).id) === null){
                data.push(approval.all()[i].data)
            }
        }
    }

    res.json(JSON.stringify(data))

})



app.post('/bots/:id/upvote/:userid', (req, res) => {
    let id = req.params.id
    let userid = req.params.userid


    if(bots.get(id).upvoted !== undefined){
        if(bots.get(id).upvoted.includes(userid))return res.json({ error: "You have already upvoted this bot!" })
    }

    if(bots.has(id)  === false){
        bots.push(`${id}.upvoted`, userid)
    }else{
        bots.push(`${id}.upvoted`, userid)
    }


    
    let options = {
        'method': 'GET',
        'url': 'https://discordapp.com/api/users/' + id,
        'headers': {
          'Authorization': 'Bot {Bot Token}',
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }

      request(options, async function (error, response) {
        let botjson = JSON.parse(response.body)
    let embed = new Discord.MessageEmbed()
        .setTitle("New Upvote to " + botjson.username + "#" + botjson.discriminator + " by " + client.users.cache.get(userid).tag)
        .setThumbnail(client.users.cache.get(botjson.id).displayAvatarURL())
        .addField("Total Vote " + botjson.username + " have now", bots.get(botjson.id).upvoted.length)
        .setColor("GOLD")
        .setTimestamp();

    client.channels.cache.get("{Bot Logs Channel}").send(`<@${userid}>`, embed)
    client.users.fetch(id).then(member => {
        client.users.fetch(userid).then(usermember => {
              

        
    let data = {
        "error": false,
        "t": 'vote_applied',
        "s": 200,
        "data": {
            "bot": member,
            "user": usermember
        }
    }
            wss.clients.forEach(function(da){
                for (const [key, value] of Object.entries(webSockets)) {
                    if(key === id){
                    da.send(JSON.stringify(data))
                    }
                }
            })
            request({
                'method': 'POST',
                'url': bots.get(`${req.params.id}.webhook`),
                headers: {
                  'Content-Type': 'application/json'
                },
                'body': JSON.stringify(data)
              
              }, function (error, response) {
              });
            

    res.json({ "success": true, "message": "This bot has been successfully upvoted!!" })
})
})
    })

})


app.get('/search', (req, res) => {
    res.sendFile(path.join(__dirname , "./search.html"))

})

app.get('/database/:value', (req, res) => {
    res.json(bots.get(req.params.value))

})

app.post('/search/:term', (req, res) => {
    let id = req.params.term
    let data = []
    for(i in bots.all()){
        if(bots.get(bots.all()[i].ID).username === undefined)continue
        if(bots.get(bots.all()[i].ID).username.toLowerCase().includes(id) === true){
            data.push(bots.all()[i].data)
        }
    }
    res.json(data)


})

app.post('/certified', (req, res) => {
    let id = req.params.term
    let data = []
    for(i in bots.all()){
        if(bots.get(bots.all()[i].ID).username === undefined)continue
        if(bots.get(bots.all()[i].ID).certified === true){
            data.push(bots.all()[i].data)
        }
    }
    res.json(data)


})

app.get('/style.css', (req, res) => {
    res.sendFile(__dirname + "/" + "style.css")
})

app.get('/tags', (req, res) => {
    res.sendFile(__dirname + "/" + "tags.html")
})

app.post("/tags/:search", (req, res) => {
    let id = req.params.search
    let data = []
    for(i in bots.all()){
        if(bots.get(bots.all()[i].ID).username === undefined)continue
        if(bots.get(bots.all()[i].ID).tag.toLowerCase() === id.toLowerCase()){
            data.push(bots.all()[i].data)
        }
    }

    res.json(data)
})


app.get('/user', (req, res) => {
    let user = req.params.user;
    res.sendFile(__dirname + "/" + "users.html")
})

app.post('/token', (req, res) => {
    let user = req.params.user;
    res.sendFile(__dirname + "/" + "users.html")
})


app.post('/report/:id/:reason/:reporter', (req, res) => {
    
    let user = req.params.id;
    let reason = req.params.reason;
    let reporter = req.params.reporter
    client.users.fetch(reporter).then(users => {
    client.users.fetch(user).then(member => {
        if(member === undefined || member === null)return res.json({ status: 404, errorMessage: "Cannot found the bot in our database!" })
    let embed = new Discord.MessageEmbed()
        .setTitle("Reported Bot: " + member.tag)
        .addField("Username", member.username, true)
        .addField("ID", member.id, true)
        .addField("Discriminator", member.discriminator, true)
        .addField("Reporter Username", users.username, true)
        .addField("Reporter ID", users.id, true)
        .addField("Reporter Discriminator", users.discriminator, true)
        .addField("Reporter Page", `[link]({Your Website Hostname}user?id=${users.id})`)
        .addField("Reason", reason)
        .addField("Bot Page", `[link]({Your Website Hostname}bot?botid=${member.id})`)
        .setColor("RED")
        .setThumbnail(member.displayAvatarURL())
        .setTimestamp();

    client.channels.cache.get("737028587093491793").send(`<@&735587815810924635>`, embed)
    res.json({status: 200})
    })
})
})

app.get('/mailing', (req, res) => {
    let user = req.params.user;
    res.sendFile(path.join(__dirname, "./mailing.html"))
})

app.get('/userinserver/:id', (req, res) => {
    let user = req.params.id;
    if(client.guilds.cache.get("735303016168816652").member(user)){
    res.status(200).json({ inserver: true })
    }else{
    res.status(200).json({ inserver: false })
    }
})


app.get('/user', (req, res) => {
    let user = req.params.user;
    res.sendFile(__dirname + "/" + "users.html")
})

const download = require('image-downloader')

const { createCanvas, loadImage } = require('canvas')
const Canvas = require('canvas')

app.get('/bot/:id/widget', async(req, res) => {
    if(bots.has(req.params.id) === false)return res.send("Cannot Find Bot with the provided id.")
    
let canvas;
if(bots.get(`${req.params.id}.certified`) !== true){
    canvas = createCanvas(370, 197.5)
}else{
    canvas = createCanvas(370, 187.5)
}
const ctx = canvas.getContext('2d')
ctx.fillStyle = "#424141";
ctx.fillRect(0, 0, canvas.width, canvas.height);
    client.users.fetch(req.params.id).then(async(member) => {
            // saved to /path/to/dest/image.jpg
            let user = bots.get(`${req.params.id}`)
            client.users.fetch(user.authorid).then(async(usermember) => {
                const options = {
                    url: member.displayAvatarURL(),
                    dest: './avatar.png'                // will be saved to /path/to/dest/image.jpg
                  }
                  download.image(options)
                    .then(async({ filename }) => {
          ctx.font = '15px Impact'
          ctx.fillStyle = "lightblue";
          ctx.fillText(user.username + "#" + user.discriminator, 12.5, 25)

          if(bots.get(`${req.params.id}.certified`) !== true){
          ctx.font = '10px Impact'
          ctx.fillStyle = "white";
          ctx.fillText("Widget designed and powered by Hydrogen Bots Club", 100, 190)
          }

          ctx.font = '15px Impact'
          ctx.fillStyle = "green";
          ctx.fillText(`Current Status: ${member.presence.status}`, 175, 25)

          ctx.font = '15px Impact'
          ctx.fillStyle = "cyan";
          ctx.fillText(`Author: ${usermember.tag}`, 12.5, 50)

          ctx.font = '15px Impact'
          ctx.fillStyle = "skyblue";
          ctx.fillText(`Tag: ${user.tag}`, 12.5, 75)

          ctx.font = '15px Impact'
          ctx.fillStyle = "lightblue";
          ctx.fillText(`Vote(s): ${user.upvoted.length.toLocaleString()}`, 12.5, 100)

          if(user.guildcount !== undefined && user.guildcount !== ''){
            ctx.font = '15px Impact'
            ctx.fillStyle = "gold";
            ctx.fillText(`Guildcount: ${user.guildcount.toLocaleString()}`, 12.5, 125)
          }else{
            ctx.font = '15px Impact'
            ctx.fillStyle = "gold";
            ctx.fillText(`Guildcount: N/A`, 12.5, 125)
          }

          if(user.website !== undefined && user.website !== ''){
            ctx.font = '15px Impact'
            ctx.fillStyle = "gold";
            ctx.fillText(`Website:`, 12.5, 150)
            ctx.fillText(user.website, 12.5, 175)
          }else{
            ctx.font = '15px Impact'
            ctx.fillStyle = "gold";
            ctx.fillText(`Website:`, 12.5, 150)
            ctx.fillText(`N/A`, 12.5, 175)
          }

          const myimg = await Canvas.loadImage(member.displayAvatarURL({ format: 'jpg' }))

          ctx.save();
          ctx.beginPath();
    ctx.arc(295, 112.5, 50, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

          ctx.drawImage(myimg, 245, 62.5, 100, 100)
          
          const buffer = canvas.toBuffer('image/png')
            fs.writeFileSync('./images/widget.png', buffer)
            res.sendFile(__dirname + "/images/widget.png")
        })
            })
          })
})

app.get('/approvebot', (req, res) => {
    let user = req.params.user;
    res.sendFile(__dirname + "/" + "approvebot.html")
})

let wsocket = https.createServer({
    cert: fs.readFileSync('./cert.pem')
  }, app)
  .listen(443);
  
  let server = http.createServer({
  cert: fs.readFileSync('./cert.pem')
  }, app)
  .listen(80);
  function noop() {}

  function heartbeat() {
    this.isAlive = true;
  }
  const WebSocket = require('ws')
  const wss = new WebSocket.Server({ server });
  let webSockets = {}

  wss.on('connection', function connection(ws) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
  });
  
  const interval = setInterval(function ping() {
    wss.clients.forEach(function each(ws) {
      if (ws.isAlive === false) return ws.terminate();
  
      ws.isAlive = false;
      ws.ping(noop);
    });
  }, 30000);
  
  wss.on('close', function close() {
    clearInterval(interval);
  });

  wss.on('connection', (ws) => {
    ws.on('close', () => {
            for (const [key, value] of Object.entries(webSockets)) {
                if(value === ws){
                    console.log("deleted!")
                    delete webSockets[key]
                }
            }
    });
  });

  function isJson(json){
      try{
          JSON.parse(json)
          return true
      }catch{
          return false
      }
  }

  wss.on('connection', function connection(ws, req) {
    
    console.log("[HBC Websocket Connected]: 1 Websocket client Connected.")
    ws.send("[HBC Websocket Connected]: Websocket Successfully Connected.")
    ws.on('message', function incoming(message) {
        if(isJson(message) === false){

            ws.send("Connection Closed: Sent message must be type JSON")
            ws.close(1007)
            return
        
        }
        let wsobj = JSON.parse(message);
        if(!wsobj.Auth)return ws.send("404: Not Found: Required Field 'Auth' missing, Please input a bot api token that can be found in your bot's page.")
        if(api.has(wsobj.Auth) === false)return ws.send("401 Unauthorized: The 'Auth' token you have provided is invalid")
        
        if(wsobj.t === "hello"){
            client.users.fetch(api.get(`${wsobj.Auth}.id`)).then(member => {
            let data = {
                error: false,
                t: message.t,
                s: 200,
                b: {
                  handshakesuccessful: true,
                  websocketgateway: req.socket,
                  botinfo: member
                },
                e: null
              }
              ws.send(JSON.stringify(data))
              webSockets[member.id] = ws
            })
        }else if(wsobj.t === "respawn"){
      ws.send("[HBC Websocket Respawned] Websocket Connection Have Successfully Respawned.")
        }
    });
   
    
  });
  


  app.get('/login/callback', async(req, res) => {
    let code = req.query.code;

    let options = {
        'method': 'POST',
        'url': 'https://discordapp.com/api/oauth2/token',
        'headers': {
          'Authorization': 'Basic {Your BASE64 encoded url string(see in github docs)}',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        form: {
          'grant_type': 'authorization_code',
          'code': code,
          'redirect_uri': '{Your Website Hostname}login/callback',
          'scope': 'identify'
        }
      }

      var request = require('request');


      request(options, async function (error, response) {
        let json = JSON.parse(response.body)
        let token = json.access_token

            res.redirect('/?token=' + token)

          })

      })

      app.get('/assets/logo.png', (req, res) => {
        res.sendFile(path.join(__dirname, './hbclogo.png'))
      })

      app.get('/downloadbotpack', (req, res) => {
        res.download(path.join(__dirname, './Hydrogen-Bot-Club-bot-master.zip'))
      })

  app.get('/login', (req, res) => {
    res.redirect("https://discord.com/api/oauth2/authorize?client_id={your client id}&redirect_uri=https%3A%2F%2Fhydrogenbots.club%2Flogin%2Fcallback&response_type=code&scope=identify")
  })

  app.get('/status/:id', (req, res) => {
    client.users.fetch(req.params.id).then(member => {
        if(member.presence.activities[0] === undefined){
            res.json({ status: member.presence.status, tag: member.tag, id: member.id, state: null })
        }else{
        res.json({ status: member.presence.status, tag: member.tag, id: member.id, state: member.presence.activities })
        }
    })  
  })


  function isNumeric(num){
    return !isNaN(num)
  }

  app.get('/discord', (req, res) => {
    res.redirect("https://discord.gg/M9RzSS9")
  })

  app.get('/search.png', (req, res) => {
    res.sendFile(path.join(__dirname, "./search.png"))
  })

  app.get('/announcement', (req, res) => {
    res.json({ content: news.get("news.message") })
  })

  app.get('/gsc/:id', (req, res) => {

   res.json(serverc.get(req.params.id))
    })

    //start of api

    app.post('/api/v1/bot/:id', (req, res) => {
        let token = req.header('Authorization')
    
        if(isNumeric(servercount) === false)return res.status(500).json({ error: true, message: "500 Internal Server Error: servercount must be a number!" })
    
        if(!token || !servercount)return res.status(404).json({ error: true, message: "404 Not Found: One of the requred headers was not found" })
        
        if(api.has(token) === false)return res.status(401).json({ error: true, message: "401 Unauthorized: Header Authorization Token Invalid" })
        
        bots.set(`${api.get(token).id}.guildcount`, servercount)
        bots.set(`${api.get(token).id}.apitoken`, token)
    
        res.status(200).json({ success: true })
    })


    app.use(bodyParser.urlencoded({
        extended: true
      }));
app.use(bodyParser.json());
app.use(bodyParser.raw());
  app.post('/api/v1/servercount', (req, res) => {
    let token = req.header('Authorization')
    if(req.header("Content-Type") !== "application/json")return res.status(400).json({message:"Invalid header \"Content-Type\", please set it to \"application/json\""})
    let servercount = req.body.guild
    let shardcount = req.body.shard
    if(!token)return res.status(404).json({ error: true, message: "404 Not Found: Required Header token was not found in request!" })
    if(servercount === undefined || shardcount === undefined)return res.status(404).json({ error: true, message:"404 not found: One of the required body was not found!" })
    if(api.has(token) === false)return res.status(401).json({ error: true, message: "401 Unauthorized: Header Authorization Token Invalid" })
 

    if(isNumeric(servercount) === false || isNumeric(shardcount) === false)return res.status(400).json({ error: true, message: "400 Bad Request Error: both shardcount and servercount must be a number!" })
   
    if(!shardcount){
        shardcount = 0
    }

    bots.set(`${api.get(token).id}.guildcount`, servercount)
    bots.set(`${api.get(token).id}.shardcount`, shardcount)

    res.status(200).json({ success: true })
})


app.get('/api/v1/voters', (req, res) => {
    let token = req.header('Authorization')
    if(!token)return res.status(404).json({ error: true, message: "404 Not Found: required headers was not found" })
    if(api.has(token) === false)return res.status(401).json({ error: true, message: "401 Unauthorized: Header Authorization Token Invalid" })
    
    

    res.status(200).json({ voters: bots.get(api.get(token).id).upvoted })
})

app.get('/api/v1/bots/:id', (req, res) => {
    let token = req.header('Authorization')
    if(!token)return res.status(404).json({ error: true, message: "404 Not Found: required headers was not found" })

    if(userapi.has(token) === false)return res.status(401).json({ error: true, message: "401 Unauthorized: Header Authorization Token Invalid. This is the userapi token, which can be found in your profile page, not the bot auth token." })
    if(req.params.id.toLowerCase() === "all")return res.status(200).json(bots.all())
    if(bots.has(req.params.id) === false)return res.status(404).json({ error: true, message: "404 Bot Not Found: We cannot find the requested bot you are looking for." })
    

    res.status(200).json(bots.get(req.params.id))
})


  let rs = require("random-string")
const { pid } = require("process")
const { join } = require("path")



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
        if(data.id === req.params.id){
            api.delete(api.all()[i].ID)
        }
    }
        }

        
    api.set(x, { id: req.params.id })

    res.status(200).json({ error: false, code: x })

      })
    
  })

  

  app.post('/api/v1/gettoken/:id', (req, res) => {

    
    for(i in api.all()){
        if(JSON.parse(api.all()[i].data).id === req.params.id){
            res.status(200).json({ code: api.all()[i].ID, status: 200 })
        }
    }
    
  })


  app.post('/userapitoken/:id', (req, res) => {

    
    var x = rs({length: 24});
    for(i in userapi.all()){
        if(userapi.all()[i] !== undefined){
        let data = JSON.parse(userapi.all()[i].data)
        if(data.id === req.params.id){
            userapi.delete(userapi.all()[i].ID)
        }
    }
    }
    userapi.set(x, { id: req.params.id })

    res.status(200).json({ error: false, code: x })
  })

  app.post('/getusertoken/:id', (req, res) => {

    
    for(i in userapi.all()){
        if(JSON.parse(userapi.all()[i].data).id === req.params.id){
            res.status(200).json({ code: userapi.all()[i].ID, status: 200 })
        }
    }
    
  })

  //end of api


  client.on("ready", async() => {
      console.log(`${client.user.tag} is online!`)
      client.user.setActivity("Discord Bots Throwing Parties!", { type: "WATCHING" })

      setInterval(function(){
        client.guilds.cache.get("735303016168816652").channels.cache.get("736658164409303132").setName("Bots Listed: " + bots.all().length)
      }, 15000)
  })

  client.on("message", async(msg) => {
        if(msg.channel.id === "741430669925679226"){
            msg.react("👍")
            msg.react("👎")
        }
    })

  client.on("guildMemberAdd", async(member) => {
    if(member.guild.id !== "735303016168816652")return

    let embed = new Discord.MessageEmbed()
              .setTitle("New Member!")
              .setDescription(member.user.tag + "(" + "<@" + member.id + ">" + ") Joined!")
              .addField("Message From Staff Team", "Welcome to Hydrogen Bots Club!")
              .setColor("GREEN")
              .setTimestamp();
          client.channels.cache.get("735587834173587517").send(embed)

    
})

client.on("guildMemberRemove", async(member) => {
    if(member.guild.id !== "735303016168816652")return

    let embed = new Discord.MessageEmbed()
              .setTitle("A member left the guild!")
              .setDescription(member.user.tag + "(" + "<@" + member.id + ">" + ") left!")
              .addField("Message From Staff Team", "Goodbye! Hope you have a good impression with us!")
              .setColor("RED")
              .setTimestamp();
          client.channels.cache.get("735587834173587517").send(embed)

    
})

  client.on("message", async(message) => {
    let msg = message;
      
    let prefix = "-"
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  if (command === 'botinfo') {
      let mention = message.mentions.members.first() || client.users.cache.get(args[0])

      let member = client.users.cache.get(mention.id)
      if(member === null)return message.channel.send("I cannot find the bot in our database!")
      if(bots.has(member.id) === false)return message.channel.send("I cannot find the bot on approved bots database")
      
      let approvalbot = bots.get(member.id)
      let embed = new Discord.MessageEmbed()
          .setTitle(approvalbot.username + "#" + approvalbot.discriminator + "(" + approvalbot.id + ")'s Info")
          .setAuthor(`Created by ${approvalbot.authorusername}#${approvalbot.authordiscriminator}`, approvalbot.authoravatarurl)
          .setThumbnail(approvalbot.avatarurl)
          .addField("Invite", `[Invite](${approvalbot.invite})`)
          .addField("Support Server", `[Support Server Invite](${approvalbot.supportserver})`)
          .addField("Short Description", approvalbot.description)
          .addField("Prefix", approvalbot.prefix)
          .addField("Bot Link", "[Bot Page]({Your Website Hostname}bot?botid=" + approvalbot.id + ")")
          .setImage(`{Your Website Hostname}bot/${member.id}/widget`)
          .setColor("RANDOM")
          .setTimestamp();

        if(approvalbot.certified === true){
            embed.setDescription("⭐ Certified Bot")
        }
      message.reply(embed)
  }else if(command === "mute"){
      if(msg.member.roles.cache.has("735587815810924635") === false)return message.channel.send("You must have moderator role to use this command!")
      

      if(!args[0])return(msg.channel.send("Please enter a user id to mute!"))
      let mention = client.guilds.cache.get("735303016168816652").member(args[0])
      let reason = args.join(' ').slice(args[0].length)
      if(!reason)return msg.channel.send("Please enter a reason after the user id")

      mention.roles.add("735652144035921950")
      let embed = new Discord.MessageEmbed()
                .setTitle("Mute")
                .setDescription(mention.user.tag + "(" + "<@" + mention.user.id + ">" + ") is now muted")
                .addField("Reason", reason)
                .setColor("YELLOW")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)

      mention.send("You have been muted from discordbots.club server. Reason: " + reason)

      message.channel.send("all set!")
  }else if(command === "unmute"){
    if(msg.member.roles.cache.has("735587815810924635") === false)return message.channel.send("You must have moderator role to use this command!")
    

    if(!args[0])return(msg.channel.send("Please enter a user id to unmute!"))
  let mention = client.guilds.cache.get("735303016168816652").member(args[0])

    mention.roles.remove("735652144035921950")

    let embed = new Discord.MessageEmbed()
                .setTitle("Unmute")
                .setDescription(mention.user.tag + "(" + "<@" + mention.user.id + ">" + ") is now unmuted")
                .setColor("BLUE")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)

    mention.send("You have been unmuted from discordbots.club server.")

    message.channel.send("all set!")
}else if(command === "kick"){
    if(msg.member.roles.cache.has("735587815810924635") === false)return message.channel.send("You must have moderator role to use this command!")
    

    if(!args[0])return(msg.channel.send("Please enter a user id to kick!"))
    let mention = client.guilds.cache.get("735303016168816652").member(args[0])
    let reason = args.join(' ').slice(args[0].length)
    if(!reason)return msg.channel.send("Please enter a reason after the user id")
    if(mention.kickable === false)return message.channel.send("I cannot kick the user!")
    
    let embed = new Discord.MessageEmbed()
                .setTitle("Kick")
                .setDescription(mention.user.tag + "(" + "<@" + mention.user.id + ">" + ") is now kicked")
                .addField("Reason", reason)
                .setColor("RED")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)
    client.users.fetch(args[0]).then(member => {
    member.send("You have been kicked from discordbots.club server. Reason: " + reason)
    })

    setTimeout(function(){
        mention.kick(reason)
    }, 3000)
    message.channel.send("all set!")
}else if(command === "ban"){
    if(msg.member.roles.cache.has("735587815810924635") === false)return message.channel.send("You must have moderator role to use this command!")
    

    if(!args[0])return(msg.channel.send("Please enter a user id to ban!"))
    let mention = client.guilds.cache.get("735303016168816652").member(args[0])
    let reason = args.join(' ').slice(args[0].length)
    if(!reason)return msg.channel.send("Please enter a reason after the user id")
    if(mention.bannable === false)return message.channel.send("I cannot ban the user!")

    let embed = new Discord.MessageEmbed()
                .setTitle("Ban")
                .setDescription(mention.user.tag + "(" + "<@" + mention.user.id + ">" + ") is now banned")
                .addField("Reason", reason)
                .setColor("DARK_RED")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)
    
    client.users.fetch(args[0]).then(member => {
    member.send("You have been banned from discordbots.club server. Reason: " + reason)
    })
    setTimeout(function(){
        mention.ban(reason)
        }, 3000)

    message.channel.send("all set!")

}else if(command === "unban"){
    if(msg.member.roles.cache.has("735587815810924635") === false)return message.channel.send("You must have moderator role to use this command!")
    

    if(!args[0])return(msg.channel.send("Please enter a user id to unban!"))
    client.guilds.cache.get("735303016168816652").members.unban(args[0])

    let embed = new Discord.MessageEmbed()
                .setTitle("Unban")
                .setDescription(mention.user.tag + "(" + "<@" + mention.user.id + ">" + ") is now unbanned")
                .setColor("BLUE")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)

message.channel.send("all set!")
}else if(command === "poststats"){
    let membermen = msg.mentions.members.first();
    if(!membermen)return(msg.reply("Please mention a bot to post stat count!"))
    let mentioned = client.users.cache.get(membermen.id)
    if(mentioned.bot === false)return msg.reply("Please mention a bot!")

    if(bots.has(mentioned.id) === false)return msg.reply("I cannot find the bot in our database!")
    if(!args[1])return(msg.reply("Please enter a number of your server count!"))
    if(bots.get(mentioned.id).authorid !== msg.author.id)return(msg.reply("You do not have permission to edit this bot's servercount!"))
    if(isNumeric(args[1]) === false)return msg.reply("Servercount must be a number!")
    bots.set(`${mentioned.id}.guildcount`, args[1])
    msg.reply("Servercount Set!")
}else if(command === "delete"){
    if(!args[0])return msg.reply("please send the id of your bot!")
    let params = args.join(" ").slice(args[0].length)
    if(!params)return(msg.reply("please send a reason for removal"))
    if(["539195184357965833", "437019658374348801", "720353244307783863", "432340835074572289"].includes(msg.author.id) === false || msg.author.id !== bots.get(args[0]).authorid)return msg.reply("You must be to bot's owner to use this command!")

    if(bots.has(args[0]) === true){
        bots.delete(args[0])
        msg.reply("Successfully removed your bot!")
        client.users.fetch(args[0]).then(member => {
            client.channels.cache.get("{Bot Logs Channel}").send(`\`${member.tag}\`(<@${args[0]}>) was deleted by ${msg.author.tag}`)
        })
        
    }else if(approval.has(args[0]) === true){
        approval.delete(args[0])
        msg.reply("successfully deleted your bot!")
    }
}
})

  client.on("guildMemberAdd", (member) => {
      if(member.guild.id !== "735303016168816652")return
      if(!member.user.bot){
          let joinembed = new Discord.MessageEmbed()
            .setTitle("Welcome to Hydrogen Bots Club!")
            .setDescription("Hydrogen Bots Club is a server focussing on bot development and friendly community!")
            .addField("Please check out our rules", "<#735587825046650921> | Checking out rules is really important for you in the servers.")
            .addField("Please check out our bot's guidelines", "<#735701885067067493> | Before submitting your bot, please checkout our guidelines for submitting a bot!")
            .setColor("BLUE")
            .setFooter("Welcome!")
            .setTimestamp();
          member.roles.add("{Your member role}")
          member.send(joinembed)
          if(member.id === "723251152740810773"){
              member.send("welcome goldilocks :)")
          }
      }else{
          member.roles.add("{Bot Role}")
      }
  })

  client.on("message", async(message) => {
      let msg = message
      if(message.author.bot)return;
      if(msg.channel.type === "dm")return
      if(msg.member.hasPermission("MANAGE_MESSAGES"))return;

      if(msg.content.toLowerCase().includes("discord.gg/" || "discord.com/invite" || "youtube.com")) {

        msg.delete()
        let reason = "Advertising"
        let embed = new Discord.MessageEmbed()
                .setTitle("Link Posted")
                .setDescription(msg.author.tag + "(" + "<@" + msg.author.id + ">" + ") posted a link in <#" + msg.channel.id + ">")
                .setColor("DARK_RED")
                .setTimestamp();
            client.channels.cache.get("735587836148973669").send(embed)
            let banembed = new Discord.MessageEmbed()
                .setTitle("Link Notice")
                .setDescription("You have posted a link in <#" + msg.channel.id + ">. This is not allowed!")
                .setColor("DARK_RED")
                .setTimestamp();
            message.author.send(banembed)
      }

  })



  client.on("ready", ()=>{
    for(i in bots.all()){
        bots.set(`${bots.all()[i].ID}.avatarurl`, client.users.cache.get(bots.all()[i].ID).displayAvatarURL())
    }
      setInterval(function(){
        for(i in bots.all()){
            bots.set(`${bots.all()[i].ID}.avatarurl`, client.users.cache.get(bots.all()[i].ID).displayAvatarURL())
        }
      }, 43200000)
  })




  client.on("message", async(message) => {
    let msg = message
    if(message.author.bot)return;
    if(msg.channel.type === "text")return

    

    if(msg.content.toLowerCase().includes("discord.gg/" || "discord.com/invite" || "youtube.com")) {
      let reason = "Advertising"
      let embed = new Discord.MessageEmbed()
              .setTitle("Link Posted")
              .setDescription(msg.author.tag + "(" + "<@" + msg.author.id + ">" + ") posted a link in dm.")
              .setColor("DARK_RED")
              .setTimestamp();
          client.channels.cache.get("735587836148973669").send(embed)
          let banembed = new Discord.MessageEmbed()
              .setTitle("Link Notice")
              .setDescription("You have posted a link in dm. This is not allowed!")
              .setColor("DARK_RED")
              .setTimestamp();
          message.author.send(banembed)
    }

})

  client.on("userUpdate", async(olduser, newuser) => {
    if(bots.has(newuser.id) === false)return

    console.log(newuser)
    bots.set(`${newuser.id}.username`, newuser.username)
    bots.set(`${newuser.id}.discriminator`, newuser.discriminator)
    bots.set(`${newuser.id}.avatarurl`, `https://cdn.discordapp.com/avatars/${newuser.id}/${newuser.avatar}.png`)
  })
  
  client.on("userUpdate", async(olduser, newuser) => {

    for(i in bots.all()){
        if(bots.all()[i].data.authorid === newuser.id){
            bots.set(`${bots.all()[i].ID}.authoravatarurl`, newuser.displayAvatarURL())
        }
    }
  })

  client.on("presenceUpdate", async(old, newp) => {
    if(newp.user.bot)return
    if(client.guilds.cache.get("735303016168816652").member(newp.user)){
        if( newp.activities[0] === undefined || newp.activities[0].state === null || !newp.activities[0].state.toLowerCase().includes("hydrogenbots.club")){
            client.guilds.cache.get("735303016168816652").member(newp.user).roles.remove("{Supporter Role}")
        }else if(newp.activities[0].state !== null && newp.activities[0].state.toLowerCase().includes("hydrogenbots.club")){
            client.guilds.cache.get("735303016168816652").member(newp.user).roles.add("{Supporter Role}")
        }
    }
  })


  client.on("message", async(message) => {
    
      let prefix = "-"
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    if(message.guild.id !== "735326274226225242")return
	const args = message.content.slice(prefix.length).trim().split(/ +/g);
	const command = args.shift().toLowerCase();
	if (command === 'getinqueuebotinfo') {
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(approval.has(args[0]) === false)return message.channel.send("I cannot find the bot on approval queue")
        let approvalbot = approval.get(args[0])
        let embed = new Discord.MessageEmbed()
            .setTitle(approvalbot.username + "#" + approvalbot.discriminator + "(" + approvalbot.id + ")'s Info")
            .setAuthor(`Created by ${approvalbot.authorusername}#${approvalbot.authordiscriminator}`, approvalbot.authoravatarurl)
            .setThumbnail(approvalbot.avatarurl)
            .addField("Invite", approvalbot.invite)
            .addField("Support Server", approvalbot.supportserver)
            .addField("Prefix", approvalbot.description)
            .addField("Bot Link", "{Your Website Hostname}authorizebot?botid=" + approvalbot.id)
            .setColor("RANDOM")
            .setTimestamp();
        message.reply(embed)
	} else if (command === 'getapprovedbotinfo') {
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(bots.has(args[0]) === false)return message.channel.send("I cannot find the bot on approved bots database")
        let approvalbot = bots.get(args[0])
        let embed = new Discord.MessageEmbed()
            .setTitle(approvalbot.username + "#" + approvalbot.discriminator + "(" + approvalbot.id + ")'s Info")
            .setAuthor(`Created by ${approvalbot.authorusername}#${approvalbot.authordiscriminator}`, approvalbot.authoravatarurl)
            .setThumbnail(approvalbot.avatarurl)
            .addField("Invite", approvalbot.invite)
            .addField("Support Server", approvalbot.supportserver)
            .addField("Prefix", approvalbot.description)
            .addField("Bot Link", "{Your Website Hostname}bot?botid=" + approvalbot.id)
            .setColor("RANDOM")
            .setTimestamp();
        message.reply(embed)
	} else if (command === 'approve'){
        
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(approval.has(args[0]) === false)return message.channel.send("I cannot find the bot on approval queue")
        let approvalbot = approval.get(args[0])

        client.users.fetch(approvalbot.authorid).then(member => {
            let embed = new Discord.MessageEmbed()
                .setTitle("Congratulations!")
                .setDescription("Your bot, **__" + approvalbot.username + "#" + approvalbot.discriminator + "__** has been approved!")
                .addField("Responsible Approver", message.author.tag)
                .setColor("GREEN")
                .setTimestamp()
                .setFooter("Hydrogen Bot Club Approval Info")
                .setTimestamp();
            member.send(embed)
        })

        let approveembed = new Discord.MessageEmbed()
                .setTitle(approvalbot.username + "#" + approvalbot.discriminator + " has been approved!")
                .addField("Responsible Approver", message.author.tag)
                .setColor("GREEN")
                .setTimestamp()
                .setFooter("Hydrogen Bot Club Approval Info")
                .setTimestamp();

        client.channels.cache.get("{Bot Logs Channel}").send(approveembed)


        
        let options = {
            'method': 'PUT',
            'url': `https://discordapp.com/api/guilds/735303016168816652/members/${approvalbot.authorid}/roles/{Your bot developer role}`,
            'headers': {
              'Authorization': 'Bot NzM1MjIwMTAxNzE2MTE1NTM3.XxjMBg.47IuJrnxicJJo9t-bNpwgmsl8HM',
              'Content-Type': 'application/json'
            }
          }
    
          
    
          request(options, async function (error, response){
              console.log("Role Applied")
          } )
          const invalidprefix = ['-', '!', '@', '#', '<', '>', '[', ']', '{', '}', '(', ')']
          if(invalidprefix.includes(approvalbot.prefix) === true){
            let options = {
                'method': 'PUT',
                'url': `https://discordapp.com/api/guilds/735303016168816652/members/${approvalbot.id}/roles/735652144035921950`,
                'headers': {
                  'Authorization': 'Bot NzM1MjIwMTAxNzE2MTE1NTM3.XxjMBg.47IuJrnxicJJo9t-bNpwgmsl8HM',
                  'Content-Type': 'application/json'
                }
              }
        
              
        
              request(options, async function (error, response){
                  console.log("Mute Role Applied: common prefix")
              } )
          }


        bots.set(approvalbot.id, approvalbot)
        approval.delete(approvalbot.id)
        message.channel.send("All set!")
    }else if (command === 'deny'){
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(approval.has(args[0]) === false)return message.channel.send("I cannot find the bot on approval queue")
        let params = args.join(' ').slice(args[0].length)
        if(!params)return message.channel.send("Please enter a reason for the deny.")
        let approvalbot = approval.get(args[0])

        client.users.fetch(approvalbot.authorid).then(member => {
            let embed = new Discord.MessageEmbed()
                .setTitle("Your bot, " + approvalbot.username + "#" + approvalbot.discriminator + " has been denied")
                .addField("Reason", params)
                .addField("Responsible Approver", message.author.tag)
                .setColor("RED")
                .setTimestamp()
                .setFooter("Hydrogen Bot Club Denial Info")
                .setTimestamp();
            member.send(embed)
        })

    let denial = new Discord.MessageEmbed()
        .setTitle(approvalbot.username + "#" + approvalbot.discriminator + " has been denied")
        .addField("Reason", params)
        .addField("Responsible Approver", message.author.tag)
        .setColor("BLUE")
        .setTimestamp()
        .setFooter("Hydrogen Bot Club Denial Info")
        .setTimestamp();

        client.channels.cache.get("{Bot Logs Channel}").send(denial)

        approval.delete(approvalbot.id)
        message.channel.send("All set!")
    } else if (command === 'certify'){
        
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(bots.has(args[0]) === false)return message.channel.send("I cannot find the bot on my database")
        if(bots.get(`${args[0]}.certified`) === true)return message.channel.send("This bot is already a certified bot!")
        bots.set(`${args[0]}.certified`, true)
        let approvalbot = bots.get(args[0])

        client.guilds.cache.get("735303016168816652").member(bots.get(args[0]).id).roles.add("{Certificated Bot Role}")

        client.users.fetch(approvalbot.authorid).then(member => {
            let embed = new Discord.MessageEmbed()
                .setTitle("Your bot, " + approvalbot.username + "#" + approvalbot.discriminator + " is certified!")
                .addField("Responsible Approver", message.author.tag)
                .setColor("GOLD")
                .setTimestamp()
                .setFooter("Hydrogen Bot Club Certification Info")
                .setTimestamp();
            member.send(embed)
        })

    let denial = new Discord.MessageEmbed()
        .setTitle(approvalbot.username + "#" + approvalbot.discriminator + " is now a certified bot!")
        .addField("Responsible Approver", message.author.tag)
        .setColor("GOLD")
        .setTimestamp()
        .setFooter("Hydrogen Bot Club Certification Info")
        .setTimestamp();

        client.channels.cache.get("{Bot Logs Channel}").send(denial)


        message.channel.send("All set")
    }else if (command === 'uncertify'){
        
        if(!args[0])return message.channel.send("Please input a bot id!")
        if(bots.has(args[0]) === false)return message.channel.send("I cannot find the bot on my database")
        if(bots.get(`${args[0]}.certified`) === false)return message.channel.send("This bot is not a certified bot!")
        bots.set(`${args[0]}.certified`, false)

        let approvalbot = bots.get(args[0])
        client.guilds.cache.get("735303016168816652").member(bots.get(args[0]).id).roles.remove("{Certificated Bot Role}")
        client.users.fetch(approvalbot.authorid).then(member => {
            let embed = new Discord.MessageEmbed()
                .setTitle("Your bot, " + approvalbot.username + "#" + approvalbot.discriminator + " is no longer certified!")
                .addField("Responsible Approver", message.author.tag)
                .setColor("RED")
                .setTimestamp()
                .setFooter("Hydrogen Bot Club Certification Info")
                .setTimestamp();
            member.send(embed)
        })

    let denial = new Discord.MessageEmbed()
        .setTitle(approvalbot.username + "#" + approvalbot.discriminator + " is no longer a certified bot!")
        .addField("Responsible Approver", message.author.tag)
        .setColor("RED")
        .setTimestamp()
        .setFooter("Hydrogen Bot Club Certification Info")
        .setTimestamp();

        client.channels.cache.get("{Bot Logs Channel}").send(denial)


        message.channel.send("All set")
    }else if(command === "websitenews"){
        let param = args.join(' ')
        if(!param)return(message.reply("Please input an announcement!"))
        if(param.length > 256)return message.reply("The length of the announcements must not be greater than 256 characters.")
        news.set("news", { message: param })

        message.reply("All set! " + param)
    }
  })
  client.login("{Bot Token}")