const http = require("node:http");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { spawn } = require("node:child_process");
const ExcelJS = require("exceljs");

const ROOT = __dirname;
const STORAGE_ROOT = process.env.DEAL_BOARD_STORAGE_DIR
  ? path.resolve(process.env.DEAL_BOARD_STORAGE_DIR)
  : ROOT;
const DATA_DIR = path.join(STORAGE_ROOT, "data");
const BACKUP_DIR = path.join(STORAGE_ROOT, "backups");
const DATABASE_FILE = path.join(DATA_DIR, "VC Deal Board.xlsx");
const PORT = Number(process.env.PORT || 4173);
const HOST = "127.0.0.1";
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const MAX_BACKUPS = 50;

const COLUMNS = [
  { header: "ID", key: "id", width: 38 },
  { header: "Company", key: "company", width: 24 },
  { header: "Website", key: "website", width: 34 },
  { header: "One Liner", key: "oneLiner", width: 48 },
  { header: "Stage", key: "stage", width: 16 },
  { header: "Raising Status", key: "raisingStatus", width: 18 },
  { header: "Round Size", key: "roundSize", width: 18 },
  { header: "Valuation", key: "valuation", width: 22 },
  { header: "Lead Investor", key: "leadInvestor", width: 24 },
  { header: "Tier", key: "tier", width: 10 },
  { header: "Tags", key: "tags", width: 28 },
  { header: "Shareable Blurb", key: "blurb", width: 70 },
  { header: "Created At", key: "createdAt", width: 24 },
  { header: "Updated At", key: "updatedAt", width: 24 },
];

const TEXT_LIMITS = {
  company: 100,
  website: 300,
  oneLiner: 300,
  stage: 60,
  raisingStatus: 40,
  roundSize: 80,
  valuation: 80,
  leadInvestor: 120,
  blurb: 3000,
};

const ALLOWED_STATUSES = new Set(["Raising", "Raising soon", "Not raising", "Unknown"]);
let writeQueue = Promise.resolve();

function cleanText(value, limit) {
  return String(value ?? "").replaceAll("\u0000", "").trim().slice(0, limit);
}

function normalizeUrl(value) {
  const cleaned = cleanText(value, TEXT_LIMITS.website);
  if (!cleaned) return "";
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function normalizeDeal(value) {
  if (!value || typeof value !== "object") throw new Error("Every deal must be a record.");
  const company = cleanText(value.company, TEXT_LIMITS.company);
  if (!company) throw new Error("Every deal needs a company name.");
  const status = cleanText(value.raisingStatus, TEXT_LIMITS.raisingStatus);
  const tier = Number(value.tier);
  const tags = Array.isArray(value.tags)
    ? value.tags
    : String(value.tags ?? "").split(/[,|]/);

  return {
    id: cleanText(value.id, 80) || randomUUID(),
    company,
    website: normalizeUrl(value.website),
    oneLiner: cleanText(value.oneLiner, TEXT_LIMITS.oneLiner),
    stage: cleanText(value.stage, TEXT_LIMITS.stage),
    raisingStatus: ALLOWED_STATUSES.has(status) ? status : "Unknown",
    roundSize: cleanText(value.roundSize, TEXT_LIMITS.roundSize),
    valuation: cleanText(value.valuation, TEXT_LIMITS.valuation),
    leadInvestor: cleanText(value.leadInvestor, TEXT_LIMITS.leadInvestor),
    tier: [1, 2, 3].includes(tier) ? tier : 2,
    tags: [...new Set(tags.map((tag) => cleanText(tag, 60)).filter(Boolean))].slice(0, 20),
    blurb: cleanText(value.blurb, TEXT_LIMITS.blurb),
    createdAt: cleanText(value.createdAt, 40) || new Date().toISOString(),
    updatedAt: cleanText(value.updatedAt, 40) || new Date().toISOString(),
  };
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text;
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text || "").join("");
    if (value.result != null) return String(value.result);
  }
  return String(value);
}

function timestampForFile(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function ensureFolders() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.mkdir(BACKUP_DIR, { recursive: true });
}

async function workbookFromDeals(deals) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VC Deal Board";
  workbook.created = new Date();
  workbook.modified = new Date();

  const worksheet = workbook.addWorksheet("Deals", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  worksheet.columns = COLUMNS;
  worksheet.autoFilter = { from: "A1", to: "N1" };

  deals.forEach((deal) => {
    const row = worksheet.addRow({
      ...deal,
      website: deal.website,
      tags: deal.tags.join(", "),
    });
    row.alignment = { vertical: "top", wrapText: true };
    if (deal.website) {
      row.getCell("website").value = { text: deal.website, hyperlink: deal.website };
      row.getCell("website").font = { color: { argb: "FF3565A8" }, underline: true };
    }
  });

  const header = worksheet.getRow(1);
  header.height = 24;
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2F2E2B" } };
  header.alignment = { vertical: "middle" };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.height = 42;
  });

  return workbook;
}

async function readDealsFromWorkbook(input) {
  const workbook = new ExcelJS.Workbook();
  if (Buffer.isBuffer(input)) await workbook.xlsx.load(input);
  else await workbook.xlsx.readFile(input);

  const worksheet = workbook.getWorksheet("Deals") || workbook.worksheets[0];
  if (!worksheet) throw new Error("The workbook does not contain a Deals sheet.");

  const headers = new Map();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    headers.set(cellText(cell.value).trim().toLowerCase(), columnNumber);
  });
  const required = ["company"];
  if (required.some((header) => !headers.has(header))) {
    throw new Error("This is not a VC Deal Board workbook.");
  }

  const read = (row, header) => {
    const column = headers.get(header.toLowerCase());
    return column ? cellText(row.getCell(column).value) : "";
  };
  const deals = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const company = read(row, "Company").trim();
    if (!company) return;
    deals.push(normalizeDeal({
      id: read(row, "ID"),
      company,
      website: read(row, "Website"),
      oneLiner: read(row, "One Liner"),
      stage: read(row, "Stage"),
      raisingStatus: read(row, "Raising Status"),
      roundSize: read(row, "Round Size"),
      valuation: read(row, "Valuation"),
      leadInvestor: read(row, "Lead Investor"),
      tier: read(row, "Tier"),
      tags: read(row, "Tags"),
      blurb: read(row, "Shareable Blurb"),
      createdAt: read(row, "Created At"),
      updatedAt: read(row, "Updated At"),
    }));
  });
  return deals;
}

async function revision() {
  try {
    const stat = await fs.stat(DATABASE_FILE);
    return `${stat.mtimeMs}-${stat.size}`;
  } catch (error) {
    if (error.code === "ENOENT") return "0";
    throw error;
  }
}

async function writeDeals(deals, { backup = true, expectedRevision = null } = {}) {
  return queueWrite(async () => {
    const currentRevision = await revision();
    if (expectedRevision && expectedRevision !== currentRevision) {
      throw Object.assign(new Error("The database changed in another window. Reload before saving."), { statusCode: 409 });
    }

    const normalized = deals.map(normalizeDeal);
    const workbook = await workbookFromDeals(normalized);
    const temporary = path.join(DATA_DIR, `.deal-board-${randomUUID()}.xlsx`);
    try {
      await workbook.xlsx.writeFile(temporary);

      if (backup && fsSync.existsSync(DATABASE_FILE)) {
        const backupFile = path.join(BACKUP_DIR, `VC Deal Board ${timestampForFile()}.xlsx`);
        await fs.copyFile(DATABASE_FILE, backupFile);
      }
      await fs.rename(temporary, DATABASE_FILE);
      if (backup) await pruneBackups();
    } finally {
      await fs.unlink(temporary).catch(() => undefined);
    }
    return { deals: normalized, revision: await revision() };
  });
}

function queueWrite(task) {
  const current = writeQueue.then(task, task);
  writeQueue = current.catch(() => undefined);
  return current;
}

async function pruneBackups() {
  const entries = await fs.readdir(BACKUP_DIR, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".xlsx"))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  await Promise.all(files.slice(MAX_BACKUPS).map((file) => fs.unlink(path.join(BACKUP_DIR, file))));
}

async function initializeDatabase() {
  await ensureFolders();
  if (!fsSync.existsSync(DATABASE_FILE)) await writeDeals([], { backup: false });
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("File is too large."), { statusCode: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function sendJson(response, statusCode, value) {
  const body = JSON.stringify(value);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function securityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
}

async function serveStatic(request, response, pathname) {
  const requested = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(ROOT, requested);
  if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  const allowed = new Set(["index.html", "styles.css", "app.js", "favicon.svg"]);
  if (!allowed.has(path.relative(ROOT, filePath))) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const type = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
  }[path.extname(filePath)] || "application/octet-stream";
  try {
    const body = await fs.readFile(filePath);
    response.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}

async function handleApi(request, response, pathname) {
  if (request.method === "GET" && pathname === "/api/deals") {
    const deals = await readDealsFromWorkbook(DATABASE_FILE);
    sendJson(response, 200, {
      deals,
      revision: await revision(),
      databaseFile: "data/VC Deal Board.xlsx",
      backupFolder: "backups/",
    });
    return true;
  }

  if (request.method === "PUT" && pathname === "/api/deals") {
    const body = JSON.parse((await readRequestBody(request)).toString("utf8"));
    const result = await writeDeals(Array.isArray(body.deals) ? body.deals : [], {
      expectedRevision: cleanText(body.revision, 120),
    });
    sendJson(response, 200, result);
    return true;
  }

  if (request.method === "GET" && pathname === "/api/database") {
    const stat = await fs.stat(DATABASE_FILE);
    response.writeHead(200, {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Length": stat.size,
      "Content-Disposition": 'attachment; filename="VC Deal Board.xlsx"',
      "Cache-Control": "no-store",
    });
    fsSync.createReadStream(DATABASE_FILE).pipe(response);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/restore") {
    const body = await readRequestBody(request);
    const deals = await readDealsFromWorkbook(body);
    const result = await writeDeals(deals, {
      expectedRevision: cleanText(request.headers["x-database-revision"], 120),
    });
    sendJson(response, 200, result);
    return true;
  }

  if (request.method === "POST" && pathname === "/api/open-data-folder") {
    openPath(DATA_DIR);
    sendJson(response, 200, { ok: true });
    return true;
  }

  return false;
}

function openPath(target) {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  const child = spawn(command, [target], { detached: true, stdio: "ignore" });
  child.on("error", () => undefined);
  child.unref();
}

async function requestHandler(request, response) {
  securityHeaders(response);
  const allowedHosts = new Set([`${HOST}:${PORT}`, `localhost:${PORT}`]);
  const origin = request.headers.origin;
  let originAllowed = true;
  if (origin) {
    try {
      originAllowed = allowedHosts.has(new URL(origin).host);
    } catch {
      originAllowed = false;
    }
  }
  if (!allowedHosts.has(request.headers.host || "") || !originAllowed) {
    sendJson(response, 403, { error: "Request rejected." });
    return;
  }
  if (!["GET", "HEAD"].includes(request.method) && request.headers["x-deal-board"] !== "1") {
    sendJson(response, 403, { error: "Request rejected." });
    return;
  }
  const url = new URL(request.url, `http://${request.headers.host || `${HOST}:${PORT}`}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      const handled = await handleApi(request, response, url.pathname);
      if (!handled) sendJson(response, 404, { error: "Not found" });
      return;
    }
    await serveStatic(request, response, url.pathname);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(error);
    sendJson(response, statusCode, { error: error.message || "Something went wrong." });
  }
}

async function start() {
  await initializeDatabase();
  const server = http.createServer(requestHandler);
  const url = `http://${HOST}:${PORT}`;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.log("VC Deal Board is already running. Opening the existing page.");
      if (process.env.NO_OPEN !== "1") openPath(url);
      return;
    }
    console.error("Could not start VC Deal Board:", error);
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(`VC Deal Board is running at ${url}`);
    console.log(`Master database: ${DATABASE_FILE}`);
    console.log(`Automatic backups: ${BACKUP_DIR}`);
    if (process.env.NO_OPEN !== "1") setTimeout(() => openPath(url), 300);
  });
}

start().catch((error) => {
  console.error("Could not start VC Deal Board:", error);
  process.exitCode = 1;
});
