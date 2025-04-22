import express from "express";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Setup Express app
const app = express();
app.use(express.json());

// Initialize Firebase Admin with your service account
initializeApp({
  credential: cert({
    "type": "service_account",
    "project_id": "YOUR_PROJECT_ID",
    "private_key_id": "YOUR_PRIVATE_KEY_ID",
    "private_key": "-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-XXXXX@YOUR_PROJECT_ID.iam.gserviceaccount.com",
    "client_id": "YOUR_CLIENT_ID",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-XXXXX%40YOUR_PROJECT_ID.iam.gserviceaccount.com"
  }),
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = getDatabase();

// Handle updates from Roblox
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("✅ DEFCON proxy running");
  console.log("📡 Update endpoint: https://" + process.env.RENDER_EXTERNAL_HOSTNAME + "/update");
});
