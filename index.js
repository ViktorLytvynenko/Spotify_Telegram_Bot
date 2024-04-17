import express from 'express';
import telegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import * as config from './config.js';
import mongoose from 'mongoose';
import UserModel from './Models/userModel.js';
import { counter } from './assets/counter.js';
import keys from './config/keys.js';

const app = express()
const db = keys.mongoURI;

let mongoStatus = "false"
let telegramStatus = "false"

const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
    res.status(200).json({
        telegramStatus,
        mongoStatus
    });
})

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});





mongoose.connect(db, {})
    .then(() => {
        mongoStatus = "ok"
        console.log('connected')
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
    bot.sendMessage(chatId, "Welcome to the music box - spotify search platform", {
        "reply_markup": {
            "keyboard": [["Search album", "Search artist"], ["Search track", "Search something"]]
        }
    });
    try {
        await UserModel.findOneAndUpdate({user_id: userID}, {status: "search"})
    } catch (e) {
        console.log(e)
    }
}

const setSearchStatus = (msgText) => {
    switch (msgText) {
        case "Search album":
            return 'album'
        case "Search artist":
            return 'artist'
        case "Search track":
            return 'track'
        default:
            return 'track%2Cartist%2Calbum'
    }
}

const handleSearch = async (chatId, userID, msgText) => {
    bot.sendMessage(chatId, "Please write a request")
    try {
        await UserModel.findOneAndUpdate(
            {
                user_id: userID
            },
            {
                status: "searchValue",
                type_search: setSearchStatus(msgText)
            }
        )
    } catch (e) {
        console.log(e)
    }
}

const handleSearchValue = async (chatId, userID, msgText) => {
    if (msgText.startsWith("Search")) {
        handleSearch(chatId, userID, msgText)
    } else {
        try {
            const user = await UserModel.findOne(
                {
                    user_id: userID
                }
            )

            axios(`${config.requestURL}?q=${msgText}&type=${user.type_search}&limit=50`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })
                .then(res => {
                    let list = ""
                    switch (user.type_search) {
                        case 'artist':
                            if (res.data.artists.items.length > 0) {
                                res.data.artists.items.forEach((artistItem, index) => {
                                    list += `${index + 1} - <a href="https://open.spotify.com/artist/${artistItem.id}">${artistItem.name}</a> \n`
                                })
                                bot.sendMessage(chatId, `<b>Here are your results</b>\n \n ${list}\n`, {parse_mode: "HTML"})
                            } else {
                                bot.sendMessage(chatId, `<b>No results</b>`, {parse_mode: "HTML"})
                            }
                            break
                        case 'track':
                            if (res.data.tracks.items.length > 0) {
                                res.data.tracks.items.forEach((track) => {
                                    track.artists.forEach(artist => {
                                        list += `<i>${artist.name} - ${counter(track.duration_ms)}</i>\n <a href="https://open.spotify.com/track/${track.id}">${track.name}</a>\n \n`
                                    })
                                })
                                bot.sendMessage(chatId, `<b>Here are your results</b>\n \n ${list}\n`, {parse_mode: "HTML"})
                            } else {
                                bot.sendMessage(chatId, `<b>No results</b>`, {parse_mode: "HTML"})
                            }
                            break
                        case 'album':
                            if (res.data.albums.items.length > 0) {
                                res.data.albums.items.forEach((album) => {
                                    album.artists.forEach(artist => {
                                        list += `<i>${artist.name}</i> - <a href="https://open.spotify.com/album/${album.id}">${album.name}</a> \n`
                                    })
                                })
                                bot.sendMessage(chatId, `<b>Here are your results</b>\n \n ${list}\n`, {parse_mode: "HTML"})
                            } else {
                                bot.sendMessage(chatId, `<b>No results</b>`, {parse_mode: "HTML"})
                            }
                            break
                        default:
                            console.log(res.data)
                            if (res.data.tracks.items.length > 0 || res.data.artists.items.length > 0 || res.data.albums.items.length > 0) {
                                res.data.albums.items.forEach((album) => {
                                    album.artists.forEach(artist => {
                                        list += `<i>${artist.name}</i> - <a href="https://open.spotify.com/album/${album.id}">${album.name}</a> \n`
                                    })
                                })
                                bot.sendMessage(chatId, `<b>Here are your results</b>\n \n ${list}\n`, {parse_mode: "HTML"})
                            } else {
                                bot.sendMessage(chatId, `<b>No results</b>`, {parse_mode: "HTML"})
                            }
                    }
                })
        } catch (e) {
            console.log(e)
        }
        console.log(msgText)
    }
}

const bot = new telegramBot(config.TELEGRAM_TOKEN, {polling: true})
if (bot) {
    telegramStatus = "ok"
}

bot.setMyCommands([
    {command: '/start', description: 'Start bot'},
    {command: '/search', description: 'Open menu'}
])

bot.on("text", async (msg) => {
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
        handleStart(msg.chat.id, msg.from.id)
    } else {
        if (msg.text === "/start" || msg.text === "/search") {
            handleStart(msg.chat.id, msg.from.id)
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
            }
        }
    }
})

export default app