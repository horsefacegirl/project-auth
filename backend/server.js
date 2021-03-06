import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";
import bcrypt from "bcrypt-nodejs";
import mongoose from "mongoose";

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/authAPI";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const User = mongoose.model("User", {
  name: {
    type: String,
    unique: true
  },
  email: {
    type: String,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex")
  }
});

//   PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

const authenticateUser = async (req, res, next) => {
  const user = await User.findOne({ accessToken: req.header("Authorization") });
  if (user) {
    req.user = user;
    next();
  } else {
    res.status(401).json({ loggedOut: true });
  }
};

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(bodyParser.json());

// Start defining your routes here
app.get("/", (req, res) => {
  res.send("Hello world");
});

app.get("/secrets", authenticateUser);
app.get("/secrets", (req, res) => {
  res.json({ secret: "this is the secret" });
});

//REGISTRATION
app.post("/users", async (req, res) => {
  try {
    const { name, password, email } = req.body;
    const user = new User({ name, email, password: bcrypt.hashSync(password) });
    await user.save();
    res.status(201).json({ id: user._id, accessToken: user.accessToken });
  } catch (err) {
    res
      .status(400)
      .json({
        message: "Could not create user. Please try again!",
        errors: err.errors
      });
  }
});

//LOGIN

app.post("/sessions", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user && bcrypt.compareSync(req.body.password, user.password)) {
    res.status(201).json({
      userId: user._id,
      accessToken: user.accessToken
    });
  } else {
    res.status(403).json({ message: "User not found, access forbidden" });
  }
});

// app.post("/tweets", authenticateUser);
// app.post("/tweets", async (req, res) => {});

// app.post("/sessions", async (req, res) => {
//   const user = await User.findOne({ name: req.body.name });
//   if (user && bcrypt.compareSync(req.body.password, user.password)) {
//     res.json({ userId: user._id, accessToken: user.accessToken });
//   } else {
//     res.json({ notFound: true });
//   }
// });

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
