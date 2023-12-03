const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");
const userSchema = mongoose.Schema({
  email: String,
  fullname: String,
  username: {
    type: String,
    unique: true,
  },
  password: String,
  bio: String,
  dp: { type: String, default: "def.png" },
  role: { type: String, default: "user" },
  blocked: { type: Boolean, default: false },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  story: [{ type: mongoose.Schema.Types.ObjectId, ref: "story" }],
  is_online: { type: String, default: "0" },
  key: String,
});
userSchema.plugin(plm);
module.exports = mongoose.model("user", userSchema);
