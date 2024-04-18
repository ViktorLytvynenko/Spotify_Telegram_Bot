import { Schema, model } from "mongoose";

const UserModel = new Schema({
    user_id: {
        type: String,
        required: true
    },
    chat_id: {
        type: String,
        required: true
    },
    last_message: {
        id: {
            type: String,
            required: true
        },
        text: {
            type: String,
            required: true
        }
    },
    status: {
        type: String,
        required: true
    },
    type_search: {
        type: String,
        required: false
    }
});

export default model("users", UserModel);