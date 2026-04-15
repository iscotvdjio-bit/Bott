import { Router } from "express";
import { logger } from "../lib/logger";
import fs from "fs";
import path from "path";

const router = Router();

// process.cwd() = artifacts/api-server/ (where the server is started from)
const DONATIONS_FILE = path.join(process.cwd(), "..", "discord-bot", "data", "donations.json");

interface Donor {
  name: string;
  total: number;
  source: string;
}

interface DonationData {
  donors: Donor[];
  lastReset: number | null;
  month: string;
}

function getCurrentMonth(): string {
  return new Date().toLocaleString("id-ID", { month: "long", year: "numeric" });
}

function loadDonations(): DonationData {
  if (!fs.existsSync(DONATIONS_FILE)) {
    return { donors: [], lastReset: null, month: getCurrentMonth() };
  }
  try {
    return JSON.parse(fs.readFileSync(DONATIONS_FILE, "utf8")) as DonationData;
  } catch {
    return { donors: [], lastReset: null, month: getCurrentMonth() };
  }
}

function saveDonations(data: DonationData): void {
  const dir = path.dirname(DONATIONS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DONATIONS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function addDonation(name: string, amount: number, source: string): void {
  const data = loadDonations();
  const existing = data.donors.find(d => d.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.total += amount;
    existing.source = source;
  } else {
    data.donors.push({ name, total: amount, source });
  }
  saveDonations(data);
}

// POST /api/webhook/saweria
// Payload: { donator_name, amount, message, type }
router.post("/webhook/saweria", (req, res) => {
  try {
    const { donator_name, amount } = req.body as { donator_name?: string; amount?: number };

    if (!donator_name || !amount) {
      logger.warn("Saweria webhook: missing fields", req.body);
      res.status(400).json({ ok: false, error: "Missing donator_name or amount" });
      return;
    }

    const name  = String(donator_name).trim() || "Anonim";
    const total = Number(amount) || 0;

    if (total <= 0) {
      res.status(400).json({ ok: false, error: "Invalid amount" });
      return;
    }

    addDonation(name, total, "saweria");
    logger.info({ name, total }, "Saweria donation recorded");
    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Saweria webhook error");
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

// POST /api/webhook/sociabuzz
// Payload: { event, data: { username, amount, message } } atau flat
router.post("/webhook/sociabuzz", (req, res) => {
  try {
    const body   = req.body as Record<string, unknown>;
    const nested = body.data as Record<string, unknown> | undefined;
    const name   = String(nested?.username ?? body.username ?? body.donator_name ?? "Anonim").trim();
    const amount = Number(nested?.amount ?? body.amount ?? 0);

    if (!name || amount <= 0) {
      logger.warn("Sociabuzz webhook: missing or invalid fields", req.body);
      res.status(400).json({ ok: false, error: "Missing username or amount" });
      return;
    }

    addDonation(name, amount, "sociabuzz");
    logger.info({ name, amount }, "Sociabuzz donation recorded");
    res.json({ ok: true });
  } catch (err) {
    logger.error(err, "Sociabuzz webhook error");
    res.status(500).json({ ok: false, error: "Internal error" });
  }
});

// GET /api/webhook/test — cek apakah endpoint aktif
router.get("/webhook/test", (_req, res) => {
  res.json({ ok: true, message: "Webhook endpoint aktif ✅" });
});

export default router;
