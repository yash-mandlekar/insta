const mongoose = require("mongoose");

const StorySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
  file: { type: String, required: true },
  caption: { type: String },
  date: { type: Date, default: Date.now },
  views: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  expiresAt: { type: Date, default: new Date(Date.now() + 24 * 60 * 60 * 1000) },
});

const Story = mongoose.model("Story", StorySchema);

module.exports = Story;
