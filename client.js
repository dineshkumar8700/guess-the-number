import { MessageType } from "./common.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const createLineReader = () => {
  let buffer = "";

  return async (conn) => {
    const chunk = new Uint8Array(1024);
    const bytesRead = await conn.read(chunk);
    if (bytesRead === null) return null;

    buffer += decoder.decode(chunk.subarray(0, bytesRead));
    const lines = buffer.split("\n");
    buffer = lines.pop();

    return lines;
  };
};

const send = async (conn, message) => {
  await conn.write(encoder.encode(message + "\n"));
};

const getGuessFromUser = () => {
  while (true) {
    const input = prompt("🎯 Enter a number (1-100):");
    if (input !== null && /^\d+$/.test(input)) return input;
    console.log("❌ Numbers only");
  }
};

const showServerMessage = (message) => {
  console.log("🖥️ SERVER:", message);
};

const handleResultMessage = (result) => {
  switch (result) {
    case "LOW":
      return showServerMessage("⬇️ Too Low");
    case "HIGH":
      return showServerMessage("⬆️ Too High");
    case "WIN":
      return showServerMessage("🎉 You Won");
    case "LOSE":
      return showServerMessage("😢 You Lost");
  }
};

const handleMessage = async (conn, message) => {
  switch (message.type) {
    case MessageType.WAITING:
      showServerMessage("⏳ Waiting for another player");
      return true;

    case MessageType.START:
      showServerMessage("🎮 Game Started");
      return true;

    case MessageType.YOUR_TURN: {
      const guess = getGuessFromUser();
      await send(conn, guess);
      return true;
    }

    case MessageType.RESULT:
      handleResultMessage(message.result);
      return !["WIN", "LOSE"].includes(message.result);

    case MessageType.END:
      showServerMessage("🛑 Game Finished");
      return false;

    default:
      return true;
  }
};

const handleClient = async (conn) => {
  const readLines = createLineReader();

  while (true) {
    const lines = await readLines(conn);
    if (lines === null) return;

    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line);
      const shouldContinue = await handleMessage(conn, message);
      if (!shouldContinue) return;
    }
  }
};

const connectToServer = async (port) => {
  const conn = await Deno.connect({ port, transport: "tcp" });
  console.log("✅ Connected to server");
  return conn;
};

const main = async (args) => {
  const [port = "8080"] = args;
  const conn = await connectToServer(+port);

  await handleClient(conn);
  conn.close();
  console.log("🔌 Connection closed");
};

main(Deno.args);
