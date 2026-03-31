const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" }
});

let rooms = {};

function generateChits(players) {
  const items = ["Apple","Ball","Cat","Dog","Car","Tree","Book","Phone"];
  let chits = [];

  for (let i = 0; i < players; i++) {
    for (let j = 0; j < 4; j++) {
      chits.push(items[i % items.length]);
    }
  }

  return chits.sort(() => Math.random() - 0.5);
}

io.on("connection", (socket) => {

  socket.on("create_room", (code) => {
    rooms[code] = {
      players: [],
      hands: [],
      turn: 0,
      winner: null
    };

    socket.join(code);
    rooms[code].players.push(socket.id);

    socket.emit("room_joined", {
      players: rooms[code].players,
      playerId: 0
    });
  });

  socket.on("join_room", (code) => {
    if (!rooms[code]) return;

    socket.join(code);
    rooms[code].players.push(socket.id);

    socket.emit("room_joined", {
      players: rooms[code].players,
      playerId: rooms[code].players.length - 1
    });

    io.to(code).emit("game_state", rooms[code]);
  });

  socket.on("start_game", (code) => {
    let room = rooms[code];
    let chits = generateChits(room.players.length);

    room.hands = [];
    for (let i = 0; i < room.players.length; i++) {
      room.hands.push(chits.slice(i * 4, i * 4 + 4));
    }

    io.to(code).emit("game_state", room);
  });

  socket.on("give_card", ({ roomCode, cardIndex, target }) => {
    let room = rooms[roomCode];
    let playerIndex = room.players.indexOf(socket.id);

    let card = room.hands[playerIndex][cardIndex];
    room.hands[playerIndex].splice(cardIndex, 1);
    room.hands[target].push(card);

    // winner check
    room.hands.forEach((hand, i) => {
      if (new Set(hand).size === 1 && hand.length === 4) {
        room.winner = i;
      }
    });

    room.turn = (room.turn + 1) % room.players.length;

    io.to(roomCode).emit("game_state", room);
  });

  // CHAT
  socket.on("send_message", ({ roomCode, message, sender }) => {
    io.to(roomCode).emit("receive_message", { message, sender });
  });

});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log("Server running"));