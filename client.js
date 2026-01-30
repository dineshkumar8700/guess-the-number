const encoder = new TextEncoder();
const decoder = new TextDecoder();

const readLine = async (conn) => {
  const buffer = new Uint8Array(1024);
  const bytesRead = await conn.read(buffer);

  if (bytesRead === null) return null;

  return decoder.decode(buffer.subarray(0, bytesRead)).trim();
};

const sendServerMsg = async (conn, message) => {
  await conn.write(encoder.encode(message + "\n"));
};

const getValidInput = () => {
  while (true) {
    const input = prompt("🎯 Enter a number (1-100):");
    if (input !== null && /^\d+$/.test(input)) return input;
    console.log("❌ Numbers only");
  }
};

const handleServerMessage = async (conn, message) => {
  console.log("🖥️ SERVER:", message);

  if (message === "YOUR_TURN") {
    const input = getValidInput();
    await sendServerMsg(conn, input);
  }

  if (message.includes("Won") || message.includes("Lost")) {
    return false;
  }

  return true;
};

const handleClient = async (conn) => {
  while (true) {
    const message = await readLine(conn);
    if (message === null) return;

    const shouldContinue = await handleServerMessage(conn, message);
    if (!shouldContinue) return;
  }
};

const startClient = async () => {
  const conn = await Deno.connect({ port: 8080, transport: "tcp" });
  console.log("✅ Connected to server");

  await handleClient(conn);

  conn.close();
  console.log("🔌 Connection closed");
};

startClient();
