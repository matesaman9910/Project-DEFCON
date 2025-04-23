import express from "express";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const app = express();
app.use(express.json());

console.log("Server time is:", new Date().toISOString());

// Initialize Firebase using environment variables
initializeApp({
  credential: cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase();

// When Roblox sends data here
app.post("/update", async (req, res) => {
  const { defcon, code, alarmActive } = req.body;
  try {
    await db.ref("/").set({
      defcon,
      code,
      alarmActive,
      lastUpdated: new Date().toISOString()
    });
    res.send({ status: "ok" });
  } catch (error) {
    console.error("❌ Firebase update failed:", error.message);
    res.status(500).send({ status: "error", message: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log("✅ DEFCON proxy running on port", PORT);
});
