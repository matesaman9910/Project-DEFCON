import express from "express";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const app = express();
app.use(express.json());

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: "https://project-defcon-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();

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

app.listen(10000, () => console.log("✅ DEFCON proxy running on port 10000"));
