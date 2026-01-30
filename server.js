const encoder = new TextEncoder();
const decoder = new TextDecoder();

const players = [];

const Send = async (conn, message) => {
  await conn.write(encoder.encode(message + "\n"));
};

const ReadLine = async (conn) => {
  const buffer = new Uint8Array(1024);
  const bytesRead = await conn.read(buffer);
  if (bytesRead === null) return null;
  return decoder.decode(buffer.subarray(0, bytesRead)).trim();
};

const EndGame = (p1, p2) => {
  p1.close();
  p2.close();
  console.log("🛑 Game finished");
};

const ValidateGuess = (input) => {
  const guess = Number(input);
  if (!Number.isInteger(guess)) return null;
  return guess;
};

const EvaluateGuess = async (guess, secret, current, other) => {
  if (guess === secret) {
    await Send(current, "🎉 You Won");
    await Send(other, "😢 You Lost");
    return "Win";
  }
  await Send(current, guess < secret ? "⬇️ Too Low" : "⬆️ Too High");
  return "Continue";
};

const HandleTurn = async (current, other, secret) => {
  await Send(current, "YOUR_TURN");
  const input = await ReadLine(current);
  if (input === null) return "End";

  const guess = ValidateGuess(input);
  if (guess === null) {
    await Send(current, "❌ Invalid Input");
    return "Retry";
  }

  return EvaluateGuess(guess, secret, current, other);
};

const StartGame = async (p1, p2) => {
  const secret = Math.floor(Math.random() * 100) + 1;
  console.log("🔐 Secret:", secret);

  await Send(p1, "🎮 Game Started");
  await Send(p2, "🎮 Game Started");

  let current = p1;
  let other = p2;

  while (true) {
    const result = await HandleTurn(current, other, secret);

    if (result === "Win" || result === "End") {
      EndGame(p1, p2);
      break;
    }

    if (result === "Continue") {
      [current, other] = [other, current];
    }
  }
};

const HandleConnection = async (conn) => {
  players.push(conn);
  console.log("👤 Player connected");

  if (players.length === 1) {
    await Send(conn, "👋 Welcome Player 1");
    await Send(conn, "⏳ Waiting For Player");
  }

  if (players.length === 2) {
    await Send(players[1], "👋 Welcome Player 2");
    StartGame(players[0], players[1]);
  }
};

const StartServer = async () => {
  const listener = Deno.listen({ port: 8080, transport: "tcp" });
  console.log("🚀 Server running on port 8080");

  for await (const conn of listener) {
    HandleConnection(conn);
  }
};

StartServer();
