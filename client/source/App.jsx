import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./styles.css";

// 🔌 connect backend
const socket = io("http://127.0.0.1:3001");

export default function App() {
  const [roomCode, setRoomCode] = useState("");
  const [joined, setJoined] = useState(false);
  const [players, setPlayers] = useState([]);
  const [hands, setHands] = useState([]);
  const [turn, setTurn] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [winner, setWinner] = useState(null);

  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");

  // 🏠 Create room
  const createRoom = () => {
    const code = Math.random().toString(36).substring(2, 7);
    setRoomCode(code);
    socket.emit("create_room", code);
  };

  // 🔑 Join room
  const joinRoom = () => {
    if (!roomCode) return;
    socket.emit("join_room", roomCode);
  };

  // ▶️ Start game
  const startGame = () => {
    socket.emit("start_game", roomCode);
  };

  // 🎴 Give card
  const giveCard = (target) => {
    if (selectedCard === null) return;

    socket.emit("give_card", {
      roomCode,
      cardIndex: selectedCard,
      target
    });

    setSelectedCard(null);
  };

  // 💬 Send chat
  const sendMessage = () => {
    if (!msg) return;

    socket.emit("send_message", {
      roomCode,
      message: msg,
      sender: `Player ${playerId + 1}`
    });

    setMsg("");
  };

  // 📡 Socket listeners
  useEffect(() => {
    socket.on("room_joined", (data) => {
      setJoined(true);
      setPlayers(data.players || []);
      setPlayerId(data.playerId);
    });

    socket.on("game_state", (data) => {
      setHands(data.hands || []);
      setTurn(data.turn || 0);
      setPlayers(data.players || []);
      setWinner(data.winner);
    });

    socket.on("receive_message", (data) => {
      setChat((prev) => [...prev, data]);
    });

    return () => {
      socket.off("room_joined");
      socket.off("game_state");
      socket.off("receive_message");
    };
  }, []);

  // 🔒 SAFE UI BEFORE JOIN
  if (!joined) {
    return (
      <div style={{ padding: 20 }}>
        <h1>🎮 Chit Game Online</h1>

        <input
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
        />

        <div style={{ marginTop: 10 }}>
          <button onClick={joinRoom}>Join</button>
          <button onClick={createRoom}>Create</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>🎮 Chit Game</h1>

      <h3>Room: {roomCode}</h3>
      <h3>Players: {players.length}</h3>
      <h3>Turn: Player {turn + 1}</h3>

      <button onClick={startGame}>Start Game</button>

      {/* 🃏 Cards */}
      <div style={{ marginTop: 20 }}>
        {hands && hands.map((hand, i) => (
          <div key={i} style={{ marginBottom: 15 }}>
            <h4>
              Player {i + 1} {i === playerId && "(You)"}
            </h4>

            {hand.map((card, idx) => (
              <button
                key={idx}
                onClick={() => i === playerId && setSelectedCard(idx)}
                style={{
                  margin: 5,
                  padding: 10,
                  background:
                    selectedCard === idx ? "lightblue" : "white"
                }}
              >
                {i === playerId ? card : "?"}
              </button>
            ))}

            {turn === playerId && i !== playerId && (
              <button onClick={() => giveCard(i)}>Give Card</button>
            )}
          </div>
        ))}
      </div>

      {/* 🏆 Winner */}
      {winner !== null && (
        <h2>🎉 Player {winner + 1} Wins!</h2>
      )}

      {/* 💬 Chat */}
      <div style={{ marginTop: 30 }}>
        <h3>💬 Chat</h3>

        <div style={{ height: 120, overflowY: "auto", border: "1px solid gray", padding: 5 }}>
          {chat.map((c, i) => (
            <p key={i}>
              <b>{c.sender}:</b> {c.message}
            </p>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
}