import express from "express";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const app = express();
app.use(express.json());

// Fix the line breaks in the private key
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

initializeApp({
  credential: cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: privateKey
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = getDatabase();

// This is your main endpoint the Roblox game will use
app.post("/update", (req, res) => {
  const { defcon, code, alarmActive } = req.body;

  db.ref("/").set({
    defcon,
    code,
    alarmActive,
    lastUpdated: new Date().toISOString()
  });

  res.send({ status: "ok" });
});

app.get("/", (_, res) => {
  res.send("✅ DEFCON Firebase Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ DEFCON proxy running on port", PORT);
});
