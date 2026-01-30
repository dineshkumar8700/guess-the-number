const conn = await Deno.connect({ port: 8080, transport: "tcp" });

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const ReadLine = async () => {
  const buffer = new Uint8Array(1024);
  const bytesRead = await conn.read(buffer);
  if (bytesRead === null) return null;
  return decoder.decode(buffer.subarray(0, bytesRead)).trim();
};

const Send = async (message) => {
  await conn.write(encoder.encode(message + "\n"));
};

const GetValidInput = () => {
  while (true) {
    const input = prompt("🎯 Enter a number (1-100):");
    if (input !== null && /^\d+$/.test(input)) return input;
    console.log("❌ Numbers only");
  }
};

const HandleServerMessage = async (message) => {
  console.log("🖥️ SERVER:", message);

  if (message === "YOUR_TURN") {
    const input = GetValidInput();
    await Send(input);
  }

  if (message.includes("Won") || message.includes("Lost")) {
    return false;
  }

  return true;
};

const StartClient = async () => {
  console.log("✅ Connected to server");

  while (true) {
    const message = await ReadLine();
    if (message === null) break;

    const shouldContinue = await HandleServerMessage(message);
    if (!shouldContinue) break;
  }

  conn.close();
  console.log("🔌 Connection closed");
};

StartClient();
