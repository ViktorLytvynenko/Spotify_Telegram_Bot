const {Schema, model} = require("mongoose");

const UserModel = new Schema({
    user_id: {
        type: String,
        require: true
    },
    chat_id: {
        type: String,
        require: true
    },
    last_message:{
        id: {
            type: String,
            require: true
        },
        text: {
            type: String,
            require: true
        }
    },
    status: {
        type: String,
        require: true
    },
    type_search: {
        type: String,
        require: true
    }
})

module.exports = model("users", UserModel)