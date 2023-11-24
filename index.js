const express = require('express')
const http = require("http")

const app = express()
const server = http.createServer(app)
let mongoStatus = "false"
let telegramStatus = "false"
app.get('/', (req, res) => res.status(200).json(
    {
        mongoStatus, telegramStatus
    }
))

const port = process.env.PORT || 4000;
server.listen(port);


const telegramBot = require('node-telegram-bot-api');
const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios');
const config = require('./config')
const mongoose = require("mongoose");
const UserModel = require("./Models/userModel");


mongoose.connect(config.mongoDB, { useNewUrlParser: true, useFindAndModify: false })
    .then(() => {
        console.log('connected')
        mongoStatus = "ok"
    })
    .catch((err) => {
        mongoStatus = err
    })

let token = null

const getTokenApi = async () => {
    const {data} = await axios.post('https://accounts.spotify.com/api/token', {
        grant_type: 'client_credentials',
        client_id: config.client_id,
        client_secret: config.client_secret
    }, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    })
    return data
}

getTokenApi()
    .then(data => {
        token = data.access_token
    })

const handleStart = async (chatId, userID) => {
    bot.sendMessage(chatId, "Welcome", {
        "reply_markup": {
            "keyboard": [["Search album", "Search artist"], ["Search track"]]
        }
    });
    try {
        await UserModel.findOneAndUpdate({user_id: userID}, {status: "search"})
    } catch (e) {
        console.log(e)
    }
}

const handleSearch = async (chatId, userID, msgText) => {
    bot.sendMessage(chatId, "Please write a request")
    try {
        let typeSearch = null
        switch (msgText) {
            case "Search album":
                typeSearch = 'album'
                break
            case "Search artist":
                typeSearch = 'artist'
                break
            case "Search track":
                typeSearch = 'track'
                break
            default:
                typeSearch = null
        }
        await UserModel.findOneAndUpdate(
            {
                user_id: userID
            },
            {
                status: "searchValue",
                type_search: typeSearch
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const handleSearchValue = async (chatId, userID, msgText) => {
    try {
        const user = await UserModel.findOne(
            {
                user_id: userID
            }
        )

        axios(`${config.requestURL}?q=${msgText}&type=${user.type_search}`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
            .then(res => {
                console.log(res.data.artists.items)
                let list = ""
                res.data.artists.items.forEach((artistItem, index) => {
                    list += `${index + 1} - <a href="https://open.spotify.com/artist/${artistItem.id}">${artistItem.name}</a> \n`
                })
                bot.sendMessage(chatId, `<b>Here are your results</b>\n ${list}\n`, {parse_mode: "HTML"})
            })
    } catch (e) {
        console.log(e)
    }
    console.log(msgText)

}

const bot = new telegramBot(config.TELEGRAM_TOKEN, {polling: true})
if (bot) {
    telegramStatus = "ok"
}
bot.setMyCommands([
    {command: '/start', description: 'Start bot'},
    {command: '/search', description: 'Open menu'}
])
bot.on("text", async (msg, match) => {
    //bot.sendMessage(msg.chat.id, "Welcome to the music box")
    const userCandidate = await UserModel.findOne({user_id: msg.from.id})
    if (!userCandidate) {
        const newUser = new UserModel({
            user_id: msg.from.id,
            chat_id: msg.chat.id,
            last_message: {
                id: msg.message_id,
                text: msg.text
            },
            status: 'start'
        })
        await newUser.save()
    } else {
        switch (userCandidate.status) {
            case "start":
                handleStart(msg.chat.id, userCandidate.user_id)
                break

            case "search":
                handleSearch(msg.chat.id, userCandidate.user_id, msg.text)
                break

            case "searchValue":
                handleSearchValue(msg.chat.id, userCandidate.user_id, msg.text)
                break

            case "searchResult":
                handleSearchResult()
                break
        }
        if (msg.text == "/search") {
            handleStart(msg.chat.id, userCandidate.user_id)
        }
    }
})

