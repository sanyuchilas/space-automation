import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 5173;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, "../dist");

app.use(express.static(distPath));

app.get("*", (req, res) => {
  return res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Front listening on PORT: ${PORT}...`);
});
