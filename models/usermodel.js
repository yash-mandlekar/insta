const mongoose = require("mongoose");
const plm = require("passport-local-mongoose");
const userSchema = mongoose.Schema({
  email: String,
  fullname: String,
  username: String,
  password: String,
  dp: { type: String, default: "def.png" },
  role: { type: String, default: "user" },
  blocked: { type: Boolean, default: false },
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "post" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  story: [{ type: mongoose.Schema.Types.ObjectId, ref: "story" }],
});
userSchema.plugin(plm);
module.exports = mongoose.model("user", userSchema);
