const encoder = new TextEncoder();
const decoder = new TextDecoder();

const sendClientMsg = async (conn, message) => {
  await conn.write(encoder.encode(message + "\n"));
};

const readLine = async (conn) => {
  const buffer = new Uint8Array(1024);
  const bytesRead = await conn.read(buffer);

  if (bytesRead === null) return null;

  return decoder.decode(buffer.subarray(0, bytesRead)).trim();
};

const endGame = (p1, p2) => {
  p1.close();
  p2.close();
  console.log("🛑 Game finished");
};

const validateGuess = (input) => {
  const guess = Number(input);
  if (!Number.isInteger(guess)) return null;
  return guess;
};

const evaluateGuess = async (guess, secret, current, other) => {
  if (guess === secret) {
    await sendClientMsg(current, "🎉 You Won");
    await sendClientMsg(other, "😢 You Lost");
    return "Win";
  }
  await sendClientMsg(current, guess < secret ? "⬇️ Too Low" : "⬆️ Too High");

  return "Continue";
};

const handleTurn = async (current, other, secret) => {
  await sendClientMsg(current, "YOUR_TURN");
  const input = await readLine(current);
  if (input === null) return "End";

  const guess = validateGuess(input);
  if (guess === null) {
    await sendClientMsg(current, "❌ Invalid Input");
    return "Retry";
  }

  return evaluateGuess(guess, secret, current, other);
};

const playGame = async (p1, p2, secret) => {
  let [current, other] = [p1, p2];

  while (true) {
    const result = await handleTurn(current, other, secret);

    if (result === "Win" || result === "End") {
      endGame(p1, p2);
      return;
    }

    if (result === "Continue") {
      [current, other] = [other, current];
    }
  }
};

const startGame = async (p1, p2) => {
  const secret = Math.floor(Math.random() * 100) + 1;
  console.log("🔐 Secret:", secret);

  await sendClientMsg(p1, "🎮 Game Started");
  await sendClientMsg(p2, "🎮 Game Started");

  return playGame(p1, p2, secret);
};

const handleConnection = async (conn, players) => {
  players.push(conn);
  console.log("👤 Player connected");

  if (players.length === 1) {
    await sendClientMsg(conn, "👋 Welcome Player 1");
    await sendClientMsg(conn, "⏳ Waiting For Player");
  }

  if (players.length === 2) {
    await sendClientMsg(players[1], "👋 Welcome Player 2");
    startGame(players[0], players[1]);
  }
};

const startServer = async () => {
  const players = [];

  const listener = Deno.listen({ port: 8080, transport: "tcp" });
  console.log("🚀 Server running on port 8080");

  for await (const conn of listener) {
    handleConnection(conn, players);
  }
};

startServer();
