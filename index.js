const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const fs = require('fs');

const tmi = require('tmi.js');
const { WebcastPushConnection } = require('tiktok-live-connector');

tiktokUsername = "";
twitchUsername = "";

// read names
try {
    const data = fs.readFileSync(__dirname + '/settings.json', 'utf8');
    names = JSON.parse(data);
    tiktokUsername = names.tiktok;
    twitchUsername = names.twitch;
} catch (err) {
    console.error("Error reading usernames");
}


// ---------------------------------------------------------------------------

// Twitch connection

const client = new tmi.Client({
	channels: [ twitchUsername ]
});

client.connect();

client.on('message', (channel, tags, message, self) => {
    
    let info = {
        'source' : 'twitch',
        'username': tags['display-name'],
        'type' : "chat",
        'message' : message,
    }
    
    io.emit('chat', info);
});

client.on('cheer', (channel, userstate, message) => {
    let info = {
        'source' : 'twitch',
        'username': userstate['display-name'],
        'type' : "cheer",
        'bits' : userstate.bits,
        'message' : message,
    }
    io.emit('chat', info);
});

client.on('ban', (channel, username, reason, userstate) => {
    let info = {
        'source' : 'twitch',
        'username': username,
        'type' : "ban",
    }
    io.emit('chat', info);
});

client.on("resub", (channel, username, months, message, userstate, methods) => {
    let info = {
        'source' : 'twitch',
        'username': username,
        'type' : "resub",
        'months' : userstate["msg-param-cumulative-months"]
    }
    console.log(userstate);

    io.emit('chat', info);
});

client.on("raided", (channel, username, viewers) => {
    let info = {
        'source' : 'twitch',
        'username': username,
        'type' : "raid",
        'viewers' : viewers
    }
    io.emit('chat', info);
});

client.on("subgift", (channel, username, streakMonths, recipient, methods, userstate) => {
    let info = {
        'source' : 'twitch',
        'username': username,
        'type' : "gift",
        'number' : userstate["msg-param-sender-count"]
    }
    console.log(userstate);

    io.emit('chat', info);
});

client.on("subscription", (channel, username, method, message, userstate) => {
    let info = {
        'source' : 'twitch',
        'username': username,
        'type' : "sub",
        'message' : message
    }
    console.log(userstate);

    io.emit('chat', info);
});


// ---------------------------------------------------------------------------

// TikTok connection

let tiktokLiveConnection = new WebcastPushConnection(tiktokUsername);

tiktokLiveConnection.connect().then(state => {
    //console.info(`Connected to Tiktok Stream`);
}).catch(err => {
    console.error('Tiktok streamer is offline.');
})

tiktokLiveConnection.on('roomUser', data => {
    let info = {
        'source' : 'tiktok',
        'type' : "viewers",
        'number' : data.viewerCount,
    }
    io.emit('chat', info);
})

tiktokLiveConnection.on('chat', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "chat",
        'message' : data.comment,
    }
    io.emit('chat', info);
})

tiktokLiveConnection.on('member', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "join",
    }
    io.emit('chat', info);
})
/*
tiktokLiveConnection.on('like', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "like",
    }
    io.emit('chat', info);
})
*/
tiktokLiveConnection.on('social', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "share",
    }
    io.emit('chat', info);
})

tiktokLiveConnection.on('emote', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "emote",
        'image' : data.emoteImageUrl
    }
    io.emit('chat', info);
})

tiktokLiveConnection.on('subscribe', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "sub",
    }
    io.emit('chat', info);
})



tiktokLiveConnection.on('join', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "join",
    }
    io.emit('chat', info);
})

tiktokLiveConnection.on('gift', data => {
    let info = {
        'source' : 'tiktok',
        'username': data.uniqueId,
        'type' : "gift",
        'gift' : {
            'name' : data.giftName,
            'image' : data.giftPictureUrl,
            'repeat' : data.repeatCount.toLocaleString(),
            'cost' : (data.diamondCount * data.repeatCount).toLocaleString()
        }

    }
    io.emit('chat', info);
    console.log(`${data.uniqueId} gifted ${data.giftId}`);
})

// ---------------------------------------------------------------------------

// Web server
app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/chat.html');
});

io.on('connection', (socket) => {
    console.log("We're in");
});

server.listen(3000, () => {
    console.log('Hacking the mainframe...');
});