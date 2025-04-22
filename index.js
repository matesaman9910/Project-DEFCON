import express from "express";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const app = express();
app.use(express.json());

// Auto-wake message for free plan
let isFirstRequest = true;

// Initialize Firebase with environment variables
initializeApp({
  credential: cert({
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = getDatabase();

// Main update endpoint
app.post("/update", async (req, res) => {
  if (isFirstRequest) {
    console.log("⚠️ Free plan detected: Showing warm-up message.");
    isFirstRequest = false;
    return res.send({
      status: "warming_up",
      message:
        "⏳ Warming up Render free instance. Please wait ~50 seconds. DEFCON system will activate shortly.",
    });
  }

  const { defcon, code, alarmActive } = req.body;

  await db.ref("/").set({
    defcon,
    code,
    alarmActive,
    lastUpdated: new Date().toISOString(),
  });

  res.send({ status: "ok" });
});

// Root for checking uptime
app.get("/", (_, res) => {
  res.send("✅ DEFCON Firebase Proxy is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(
    `✅ DEFCON proxy running\n🔗 Update endpoint: https://${process.env.RENDER_EXTERNAL_HOSTNAME || "your-app-name.onrender.com"}/update`
  )
);
