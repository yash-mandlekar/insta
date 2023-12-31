var express = require("express");
var router = express.Router();
var userModel = require("../models/usermodel");
var postModel = require("../models/postmodel");
var commentModel = require("../models/commentModel");
var storyModel = require("../models/storyModel");
const passport = require("passport");
const multer = require("multer");
const crypto = require("crypto");
var id3 = require("node-id3");
const path = require("path");
const Chat = require("../models/chatmodel");
const fs = require("fs");
const mailer = require("../nodemailer");
const { Readable } = require("stream");
const localStrategy = require("passport-local").Strategy;
passport.use(new localStrategy(userModel.authenticate()));

const mongoose = require("mongoose");
const usermodel = require("../models/usermodel");
mongoose
  .connect("mongodb://0.0.0.0/instagram")
  .then(() => {})
  .catch((err) => {});

var conn = mongoose.connection;
var gfsbucket;
var gfsbucketvideo;
var gfsbucketstory;
conn.once("open", () => {
  gfsbucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "post",
  });
});
conn.once("open", () => {
  gfsbucketvideo = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "video",
  });
});
conn.once("open", () => {
  gfsbucketstory = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "story",
  });
});

const storage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images/uploads");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix);
  },
});

const upload1 = multer({ storage: storage1 });

/* GET home page. */
router.get("/", function (req, res, next) {
  console.log(userModel);
  res.render("index", { title: "Express" });
});

router.get("/accounts/emailsignup", function (req, res, next) {
  res.render("signup");
});

/*authentication code  */

router.get("/feed", isLoggedIn, async function (req, res, next) {
  // Get the current user and populate their following with stories
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate([
      {
        path: "following",
        model: "user",
        populate: {
          path: "story",
          model: "story",
          populate: {
            path: "author",
            model: "user",
          },
        },
      },
    ]);

  // Get 10 random users excluding the current user and users they are following
  const random = await userModel.aggregate([
    {
      $match: {
        _id: { $nin: [user._id, ...user.following.map((f) => f._id)] }, // Exclude the current user and their following
      },
    },
    { $sample: { size: 10 } }, // Randomly select 10 users
  ]);

  // Get all posts and populate the user field
  const post = await postModel.find().populate("user");

  res.render("feed", { user, post, random });
});

router.get("/reels", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  const post = await postModel.find().populate("user");
  res.render("reels", { user, post });
});
router.get("/bookmark/:postid", isLoggedIn, async function (req, res, next) {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  if (user.bookmarks.includes(req.params.postid)) {
    user.bookmarks.splice(user.bookmarks.indexOf(req.params.postid), 1);
  } else {
    user.bookmarks.push(req.params.postid);
  }
  user.save();
  res.redirect("back");
});

router.post("/register", function (req, res) {
  var newUser = new userModel({
    username: req.body.username,
    email: req.body.email,
    fullname: req.body.fullname,
  });
  userModel.register(newUser, req.body.password).then(function (u) {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/feed");
    });
  });
});
router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "feed",
    failureRedirect: "/",
  }),
  function (req, res, next) {}
);
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect("/");
  }
}
router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/");
  });
});
/*authentication code  */

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get("/profile/:username", isLoggedIn, async (req, res, next) => {
  const founduser = await userModel
    .findOne({
      username: req.params.username,
    })
    .populate("posts");
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("posts");
  res.render("profile", { user, posts: founduser.posts, founduser });
});

router.get("/post/:postname", (req, res, next) => {
  gfsbucket.openDownloadStreamByName(req.params.postname).pipe(res);
});

router.post(
  "/postcreator",
  isLoggedIn,
  upload.single("file"),
  async (req, res, next) => {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const randomname = crypto.randomBytes(20).toString("hex");
    const postData = id3.read(req.file.buffer);

    await Readable.from(req.file.buffer).pipe(
      gfsbucket.openUploadStream(randomname + "post")
    );

    await Readable.from(req.file.buffer).pipe(
      gfsbucketvideo.openUploadStream(randomname + "video")
    );

    const post = await postModel.create({
      post: randomname + "post",
      filetype: req.file.mimetype,
      user: req.user._id,
      caption: req.body.caption,
    });

    user.posts.push(post._id);
    await user.save();
    setTimeout(() => {
      res.redirect("/feed");
    }, 500);
  }
);

// story----
router.post(
  "/story",
  isLoggedIn,
  upload.single("story"),
  async (req, res, next) => {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });

    const randomname = crypto.randomBytes(20).toString("hex");
    const postData = id3.read(req.file.buffer);
    if (req.file.mimetype.split("/")[0] == "image") {
      await Readable.from(req.file.buffer).pipe(
        gfsbucket.openUploadStream(randomname + "story")
      );
    } else {
      await Readable.from(req.file.buffer).pipe(
        gfsbucketvideo.openUploadStream(randomname + "video")
      );
    }

    const story = await storyModel.create({
      file: randomname + "story",
      author: user._id,
    });
    user.story.push(story._id);
    await user.save();
    setTimeout(() => {
      res.redirect("/feed");
    }, 500);
  }
);
// Single Story
// commment
router.get("/story/:id", isLoggedIn, async (req, res, next) => {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  
  const story = await storyModel
    .findOne({
      _id: req.params.id,
    })
    .populate("author views");
  
  // Check if the story exists
  if (!story) {
    // Handle the case where the story is not found
    return res.status(404).send("Story not found");
  }
  
  // Check if the user's ID is not already in the views array
  const isUserViewed = story.views.some(view => view._id.toString() === user._id.toString());
  const isUserAuthor = story.author._id.toString() === user._id.toString();
  
  if (!isUserViewed && !isUserAuthor) {
    story.views.push(user._id);
    await story.save();
  }
  
  res.render("story", { user, story });
});
// dlt storyyyy
router.get("/dltstory/:storyid", isLoggedIn, async (req, res, next) => {
  var user = await userModel.findOne({
    username: req.session.passport.user,
  });
  storyModel.findByIdAndDelete({
    _id: req.params.storyid,
  });
  user.story.pull(req.params.storyid);
  await user.save();

  res.redirect("/feed");
});

// dp change code
router.post(
  "/changedp",
  isLoggedIn,
  upload1.single("profile-photo"),
  (req, res, next) => {
    userModel
      .findOne({
        username: req.session.passport.user,
      })
      .then((founduser) => {
        if (founduser.dp !== "def.png") {
          fs.unlinkSync(`./public/images/uploads/${founduser.dp}`);
        }
        founduser.dp = req.file.filename;
        founduser.save();
      })
      .then(() => {
        setTimeout(() => {
          res.redirect(`/profile/${req.session.passport.user}`);
        }, 500);
      });
  }
);
// likes
router.get("/like/:id", isLoggedIn, async (req, res) => {
  const post = await postModel.findOne({ _id: req.params.id });
  if (post.likes.indexOf(req.user._id) === -1) {
    post.likes.push(req.user._id);
  } else {
    var index = post.likes.indexOf(req.user._id);
    post.likes.splice(index, 1);
  }
  await post.save();
  res.redirect(req.header("referer"));
});
// commment
router.get("/comment/:id", isLoggedIn, (req, res, next) => {
  userModel
    .findOne({
      username: req.session.passport.user,
    })
    .then((founduser) => {
      postModel
        .findOne({
          _id: req.params.id,
        })
        .populate([
          {
            path: "user",
            model: "user",
          },
          {
            path: "comments",
            model: "comment",
            populate: {
              path: "user",
              model: "user",
            },
          },
        ])
        .then((userpost) => {
          console.log(userpost.comments);
          if (
            req.header("referer").split("http://localhost:3000")[1] === "/feed"
          ) {
            res.render("comment", { founduser, userpost, route: "/feed" });
          } else if (
            req.header("referer").split("/").slice(-2).includes("profile")
          ) {
            res.render("comment", {
              founduser,
              userpost,
              route: req.header("referer").split("http://localhost:3000")[1],
            });
          } else {
            res.render("comment", { founduser, userpost, route: "/feed" });
          }
        });
    });
});
// follow user
router.get("/follow/:id", isLoggedIn, async (req, res, next) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const founduser = await userModel.findOne({
    _id: req.params.id,
  });

  if (founduser.followers.indexOf(user._id) === -1) {
    founduser.followers.push(user._id);
    user.following.push(founduser._id);
  } else {
    var index = founduser.followers.indexOf(user._id);
    founduser.followers.splice(index, 1);
    index = user.following.indexOf(founduser._id);
    user.following.splice(index, 1);
  }
  await founduser.save();
  await user.save();
  res.redirect(req.header("referer"));
});

// commmment
router.post("/comment/:id", (req, res, next) => {
  userModel
    .findOne({
      username: req.session.passport.user,
    })
    .then((user) => {
      postModel
        .findOne({
          _id: req.params.id,
        })
        .then((foundpost) => {
          commentModel
            .create({
              comment: req.body.comment,
              user: user._id,
            })
            .then((cmntcreated) => {
              foundpost.comments.push(cmntcreated._id);
              foundpost.save().then(() => {
                res.redirect(`back`);
              });
            });
        });
    });
});

router.get("/cmtLike/:cmtId/:userId", async (req, res, next) => {
  var user = await userModel.findOne({
    _id: req.params.userId,
  });
  commentModel
    .findOne({
      _id: req.params.cmtId,
    })
    .then((foundcmnt) => {
      if (foundcmnt.likes.includes(user._id)) {
        var index = foundcmnt.likes.indexOf(user._id);
        foundcmnt.likes.splice(index, 1);
      } else {
        foundcmnt.likes.push(user);
      }
      foundcmnt.save().then(() => {
        res.redirect("back");
      });
    });
});

router.get("/cmtdlt/:cmtId/:userIs/:postId", isLoggedIn, async (req, res) => {
  const user = await userModel.findOne({
    _id: req.params.userIs,
  });
  commentModel
    .findByIdAndDelete({
      _id: req.params.cmtId,
    })
    .then((cmt) => {
      res.redirect(`/comment/${req.params.postId}`);
    });
});

// ---------------explore-----

router.get("/explore", isLoggedIn, async (req, res, next) => {
  const user = await usermodel.findOne({
    username: req.session.passport.user,
  });
  const post = await postModel.find().populate("user");
  res.render("explore", { user, post });
});

router.get("/feeds/:page/:qantity", isLoggedIn, async (req, res, next) => {
  const page = req.params.page;
  const qantity = req.params.qantity;

  var user = await usermodel.findById(req.user._id);
  const foundposts = await postModel.find().populate("user");
  var posts = [];
  foundposts.forEach((post) => {
    if (
      user.following.indexOf(post.user._id) !== -1 ||
      user._id.toString() == post.user._id.toString()
    ) {
      posts.push(post);
    }
  });
  posts.sort(function (a, b) {
    return new Date(b.time) - new Date(a.time);
  });
  const skip = page * qantity;
  posts.splice(0, skip);
  posts.splice(qantity, posts.length);
  res.json({ posts: posts, user: user });
});
// ------------saved------------
router.get("/saved/:username", isLoggedIn, async (req, res, next) => {
  const founduser = await userModel
    .findOne({
      username: req.params.username,
    })
    .populate("posts");
  const user = await userModel
    .findOne({
      username: req.session.passport.user,
    })
    .populate("bookmarks");

  res.render("saved", { user, posts: user.bookmarks, founduser });
});

// dltpost
router.get("/dltpost/:postid", isLoggedIn, async (req, res, next) => {
  const user = await userModel.findOne({
    username: req.session.passport.user,
  });
  postModel
    .findByIdAndDelete({
      _id: req.params.postid,
    })
    .then((post) => {
      res.redirect("/feed");
    });
});

// messages----------
router.get("/message", isLoggedIn, async (req, res, next) => {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const users = await userModel.find({ _id: { $ne: req.user._id } });
  res.render("message", { user: user, users: users });
});

//save-chat
router.post("/save-chat", async function (req, res, next) {
  var chat = new Chat({
    sender_id: req.body.sender_id,
    receiver_id: req.body.receiver_id,
    message: req.body.message,
  });
  var newChat = await chat.save();
  res.status(200).send({ success: true, msg: "Chat Inserted", data: newChat });
});

// settings
router.get("/settings/:user", isLoggedIn, async (req, res, next) => {
  const user = await userModel.findOne({ username: req.params.user });
  const users = await userModel.find({ _id: req.user._id });
  res.render("settings", { user: user, users: users });
});
router.get("/check/:user", (req, res, next) => {
  userModel
    .findOne({
      username: req.params.user,
    })
    .then(function (user) {
      if (user) {
        res.json(true);
      } else {
        res.json(false);
      }
    });
});

router.post("/updated/:user", isLoggedIn, (req, res, next) => {
  userModel
    .findOneAndUpdate(
      {
        username: req.session.passport.user,
      },
      {
        username: req.body.username,
        fullname: req.body.fullname,
        bio: req.body.bio,
      },
      { new: true }
    )
    .then(function (update) {
      req.logIn(update, function (err) {
        if (err) {
          return next(err);
        }
        setTimeout(function () {
          return res.redirect(`/profile/${req.params.user}`);
        }, 500);
      });
    });
});

router.get("/forgot", (req, res, next) => {
  res.render("forgot");
});

router.post("/forgot", async (req, res, next) => {
  var user = await userModel.findOne({
    email: req.body.email,
  });
  if (!user) {
    res.send("we've send a mail, if user exists...");
  } else {
    crypto.randomBytes(80, async (err, buff) => {
      let key = buff.toString("hex");
      user.key = key;
      await user.save();
      mailer(req.body.email, user._id, key).then((err) => {
        console.log(err);
        res.send("mail sent");
      });
    });
  }
});

router.get("/forgot/:userid/:key", async (req, res, next) => {
  let user = await userModel.findOne({ _id: req.params.userid });
  if (user.key === req.params.key) {
    res.render("reset", { user });
  } else {
    res.send("Session expired");
  }
});

router.post("/reset/:userid", async function (req, res, next) {
  try {
    const user = await userModel.findOne({ _id: req.params.userid });

    if (!user) {
      return res.status(404).send("User not found");
    }

    await user.setPassword(req.body.password);
    user.key = "";
    await user.save();
    req.logIn(user, function (err) {
      if (err) {
        return res.status(500).send("Error while logging in");
      }
      res.redirect("/feed");
    });
  } catch (error) {
    console.error("An error occurred:", error);
    res.status(500).send("An error occurred");
  }
});

module.exports = router;
