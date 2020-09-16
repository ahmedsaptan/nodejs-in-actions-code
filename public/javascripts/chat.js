const Chat = function (socket) {
  this.socket = socket;
};

Chat.prototype.sendMessage = function (message, room) {
  this.socket.emit("message", { message, room });
};

Chat.prototype.changeRoom = function (room) {
  this.socket.emit("join", {
    newRoom: room,
  });
};

Chat.prototype.processCommand = function (cmd) {
  let words = cmd.split(" ");

  let command = words[0].substring(1, words[0].length).toLowerCase();
  let message = false;

  switch (command) {
    case "join":
      words.shift();
      let room = words.join("");
      this.changeRoom(room);
      break;

    case "nick":
      words.shift();
      var name = words.join(" ");
      this.socket.emit("nameAttempt", name);
      break;
    default:
      message = "Unrecognized command.";
  }
  return message;
};

const socket = io.connect();
$(document).ready(function () {
  let chatApp = new Chat(socket);
  socket.on("nameResult", function (result) {
    let message;
    if (result.success) {
      message = "You are now known as " + result.name + ".";
    } else {
      message = result.message;
    }
    $("#messages").append(divSystemContentElement(message));
  });
  socket.on("joinResult", function (result) {
    $("#room").text(result.room);
    $("#messages").append(divSystemContentElement("Room changed."));
  });
  socket.on("message", function (message) {
    let newElement = $("<div></div>").text(message.text);
    $("#messages").append(newElement);
  });
  socket.on("rooms", function (rooms) {
    $("#room-list").empty();

    for (let room in rooms) {
      room = room.substring(1, room.length);
      if (room != "") {
        $("#room-list").append(divEscapedContentElement(room));
      }
    }

    $("#room-list div").click(function () {
      chatApp.processCommand("/join " + $(this).text());
      $("#send-message").focus();
    });
  });
  setInterval(function () {
    socket.emit("rooms");
  }, 1000);
  $("#send-message").focus();
  $("#send-form").submit(function () {
    processUserInput(chatApp, socket);
    return false;
  });
});
