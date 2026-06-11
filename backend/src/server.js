import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
  override: true,
});

function getMongoTarget(uri) {
  if (!uri) return "missing";
  return uri
    .replace(/\/\/[^@]*@/, "//***:***@")
    .replace(/\?.*$/, "");
}

const port = Number(process.env.PORT || 5000);

async function connectDatabase() {
  try {
    await connectDB();
    await cleanupDummyData();
    console.log("MongoDB connected and dummy seed data cleaned");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error(
      "API is running, but data endpoints need MongoDB. Start MongoDB locally or update MONGODB_URI in backend/.env"
    );
  }
}

app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`Mongo target: ${getMongoTarget(process.env.MONGODB_URI)}`);
  connectDatabase();
});
