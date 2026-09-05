import "dotenv/config";
import express from "express";
import cors from "cors";
import { errorHandler } from "./guard";

import auth from "./routes/auth";
import visitors from "./routes/visitors";
import visitorsId from "./routes/visitors-id";
import residents from "./routes/residents";
import residentsId from "./routes/residents-id";
import dispatch from "./routes/dispatch";
import dispatchId from "./routes/dispatch-id";
import gate from "./routes/gate";
import dashboard from "./routes/dashboard";
import accessLogs from "./routes/access-logs";
import reports from "./routes/reports";
import reportsExport from "./routes/reports-export";
import search from "./routes/search";
import vehicles from "./routes/vehicles";
import notifications from "./routes/notifications";
import settings from "./routes/settings";
import users from "./routes/users";
import usersId from "./routes/users-id";
import officers from "./routes/officers";
import importNotebook from "./routes/import";
import resident from "./routes/resident";

const app = express();
const PORT = Number(process.env.PORT || 4000);

// CORS: reflect the request origin (bearer-token auth in headers, no cookies
// => CSRF-safe). Always reflect any origin so all deployed frontends can call
// this API. Set CORS_ORIGINS later if you want to restrict explicitly.
const origins: any = true;

app.use(cors({ origin: origins, allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "silverland-backend" }));

app.use("/api/auth", auth);
app.use("/api/visitors", visitors);
app.use("/api/visitors", visitorsId);
app.use("/api/residents", residents);
app.use("/api/residents", residentsId);
app.use("/api/dispatch", dispatch);
app.use("/api/dispatch", dispatchId);
app.use("/api/gate", gate);
app.use("/api/dashboard", dashboard);
app.use("/api/access-logs", accessLogs);
app.use("/api/reports/export", reportsExport);
app.use("/api/reports", reports);
app.use("/api/search", search);
app.use("/api/vehicles", vehicles);
app.use("/api/notifications", notifications);
app.use("/api/settings", settings);
app.use("/api/users", users);
app.use("/api/users", usersId);
app.use("/api/security-officers", officers);
app.use("/api/import/notebook", importNotebook);
app.use("/api/resident", resident);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Silverland backend listening on http://localhost:${PORT}`);
});
