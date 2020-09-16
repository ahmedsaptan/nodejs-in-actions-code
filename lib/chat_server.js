const socketIO = require("socket.io");

let io;
let guestNumber = 1;
let nickNames = {};
let namesUsed = [];
let currentRoom = {};

exports.listen = function (server) {
  io = socketIO.listen(server);
  io.set("log level", 1);
  io.sockets.on("connection", function (socket) {
    guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
    joinRoom(socket, "lobby");

    handleMessageBroadcasting(socket);
    handleNameChangeAttempts(socket, nickNames, namesUsed);
    handleRoomJoining(socket);

    // socket.on("rooms", function () {
    //   socket.emit("rooms", io.sockets.manager?.rooms);
    // });
    handleClientDisconnection(socket, nickNames, namesUsed);
  });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
  let name = `Guest ${guestNumber}`;
  nickNames[socket.id] = name;
  socket.emit("nameResults", {
    success: true,
    name,
  });

  namesUsed.push(name);
  return guestNumber + 1;
}

function joinRoom(socket, room) {
  socket.join(room);
  currentRoom[socket.id] = room;
  socket.emit("joinResult", { room });
  socket.broadcast
    .to(room)
    .emit("message", { text: `${nickNames[socket.id]} has joined ${room} .` });

  io.of("/")
    .in(room)
    .clients(function (error, clients) {
      var numClients = clients.length;
      let usersInRoom = clients;
      if (usersInRoom.length > 1) {
        let usersInRoomSummary = `Users currently in ${room} :`;

        for (let index in usersInRoom) {
          let userSocketId = usersInRoom[index].id;

          if (userSocketId != socket.id) {
            if (index > 0) {
              usersInRoomSummary += ", ";
            }

            usersInRoomSummary += nickNames[userSocketId];
          }

          usersInRoomSummary += " .";
          socket.emit("message", { text: usersInRoomSummary });
        }
      }
    });
}

function handleNameChangeAttempts(socket, nickNames, namesUsed) {
  socket.on("nameAttemp", function (name) {
    if (name.indexOf("Guest") == 0) {
      socket.emit("nameResult", {
        success: false,
        message: "Names cannot begins with Guest",
      });
    } else {
      if (namesUsed.indexOf(name) == -1) {
        let prevName = nickNames[socket.id];
        let prevNameindex = namesUsed.indexOf(prevName);
        namesUsed.push(name);
        nickNames[socket.id] = name;
        delete namesUsed[prevNameindex];
        socket.emit("nameResult", { success: true, name });
        socket.broadcast
          .to(currentRoom[socket.id])
          .emit("message", { text: `${prevName} is know now as ${name} .` });
      } else {
        socket.emit("nameResult", {
          success: false,
          message: "That name is already in use.",
        });
      }
    }
  });
}

function handleMessageBroadcasting(socket) {
  socket.on("message", function (message) {
    socket.broadcast.to(message.room).emit("message", {
      text: `${nickNames[socket.id]} : ${message.text}`,
    });
  });
}

function handleRoomJoining(socket) {
  socket.on("join", function (room) {
    socket.leave(currentRoom[socket.id]);
    joinRoom(socket, room.newRoom);
  });
}

function handleClientDisconnection(socket) {
  socket.on("disconnect", function () {
    var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
    delete namesUsed[nameIndex];
    delete nickNames[socket.id];
  });
}
