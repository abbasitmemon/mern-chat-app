const express = require("express");
const dotenv = require("dotenv");
const { chats } = require("./data/data");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const colors = require("colors");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const path = require("path");
const { Socket } = require("socket.io");
dotenv.config();
connectDB();
const app = express();

app.use(express.json()); //to accept JSON Data

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API is running..");
  });
}

// --------------------------deployment------------------------------

app.use(notFound);
app.use(errorHandler);
const PORT = process.env.PORT || 5000;
const server = app.listen(
  PORT,
  console.log(`server listing on port ${PORT}`.yellow.bold)
);
const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
  },
});

io.on("connection", (Socket) => {
  console.log("connected to socket.io");
  Socket.on("setup", (userData) => {
    Socket.join(userData._id);
    console.log(userData._id);
    Socket.emit("connected");
  });
  Socket.on("join chat", (room) => {
    Socket.join(room);
    console.log("User join Room: " + room);
  });
  Socket.on("typing", (room) => Socket.in(room).emit("typing"));
  Socket.on("stop typing", (room) => Socket.in(room).emit("stop typing"));
  Socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      Socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });
  Socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    Socket.leave(userData._id);
  });
});
