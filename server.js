import { MessageType } from "./common.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ResultType = {
  LOW: "LOW",
  HIGH: "HIGH",
  WIN: "WIN",
  LOSE: "LOSE",
};

const send = async (conn, payload) => {
  await conn.write(encoder.encode(JSON.stringify(payload) + "\n"));
};

const read = async (conn) => {
  const buffer = new Uint8Array(1024);
  const bytes = await conn.read(buffer);
  if (bytes === null) return null;
  return decoder.decode(buffer.subarray(0, bytes)).trim();
};

const closeGame = (p1, p2) => {
  p1.close();
  p2.close();
  console.log("🛑 Game ended");
};

const parseGuess = (input) => {
  const value = Number(input);
  return Number.isInteger(value) ? value : null;
};

const evaluateGuess = async (guess, secret, current, other) => {
  if (guess === secret) {
    await send(current, { type: MessageType.RESULT, result: ResultType.WIN });
    await send(other, { type: MessageType.RESULT, result: ResultType.LOSE });
    return true;
  }

  const result = guess < secret ? ResultType.LOW : ResultType.HIGH;
  await send(current, { type: MessageType.RESULT, result });
  return false;
};

const playTurn = async (current, other, secret) => {
  await send(current, { type: MessageType.YOUR_TURN });

  const input = await read(current);
  if (input === null) return true;

  const guess = parseGuess(input);
  if (guess === null) return false;

  return evaluateGuess(guess, secret, current, other);
};

const startGame = async (player1, player2) => {
  const secret = Math.floor(Math.random() * 100) + 1;
  console.log("🔐 Secret:", secret);

  await send(player1, { type: MessageType.START });
  await send(player2, { type: MessageType.START });

  let current = player1;
  let other = player2;

  while (true) {
    const finished = await playTurn(current, other, secret);
    if (finished) return closeGame(player1, player2);
    [current, other] = [other, current];
  }
};

const handleServer = async (server) => {
  const waitingQueue = [];

  for await (const conn of server) {
    console.log("👤 Player connected");
    waitingQueue.push(conn);

    await send(conn, { type: MessageType.WAITING });

    if (waitingQueue.length >= 2) {
      const p1 = waitingQueue.shift();
      const p2 = waitingQueue.shift();
      startGame(p1, p2);
    }
  }
};

const startServer = (port) => {
  const server = Deno.listen({ port, transport: "tcp" });
  console.log("🚀 Server running on", port);
  return server;
};

const main = (args) => {
  const [port = "8080"] = args;
  const server = startServer(+port);
  handleServer(server);
};

main(Deno.args);
