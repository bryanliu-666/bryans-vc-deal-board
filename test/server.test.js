const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const ExcelJS = require("exceljs");

const PROJECT_ROOT = path.resolve(__dirname, "..");

async function waitForServer(child, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Local server did not start in time.")), timeoutMs);
    const onData = (chunk) => {
      if (!chunk.toString().includes("VC Deal Board is running")) return;
      clearTimeout(timer);
      child.stdout.off("data", onData);
      resolve();
    };
    child.stdout.on("data", onData);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Local server exited early with code ${code}.`));
    });
  });
}

async function readJson(response) {
  const body = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${body.error}`);
  return body;
}

test("persists, backs up, restores, and rejects untrusted writes", async (t) => {
  const storageRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vc-deal-board-"));
  const port = 43000 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ["server.js"], {
    cwd: PROJECT_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      NO_OPEN: "1",
      DEAL_BOARD_STORAGE_DIR: storageRoot,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  t.after(async () => {
    child.kill("SIGTERM");
    await fs.rm(storageRoot, { recursive: true, force: true });
  });
  await waitForServer(child);

  const initial = await readJson(await fetch(`${base}/api/deals`));
  assert.deepEqual(initial.deals, []);

  const deal = {
    company: "测试公司",
    website: "example.com",
    oneLiner: "A clear test.",
    stage: "Series A",
    raisingStatus: "Raising",
    roundSize: "$8M",
    valuation: "$32M pre-money",
    leadInvestor: "Open",
    tier: 1,
    tags: ["AI", "Infra"],
    blurb: "第一行。\nSecond line.",
  };
  const trustedHeaders = { "Content-Type": "application/json", "X-Deal-Board": "1" };
  const created = await readJson(await fetch(`${base}/api/deals`, {
    method: "PUT",
    headers: trustedHeaders,
    body: JSON.stringify({ revision: initial.revision, deals: [deal] }),
  }));
  assert.equal(created.deals[0].website, "https://example.com");

  const downloaded = await fetch(`${base}/api/database`);
  assert.equal(downloaded.status, 200);
  const workbookCopy = Buffer.from(await downloaded.arrayBuffer());

  const removed = await readJson(await fetch(`${base}/api/deals`, {
    method: "PUT",
    headers: trustedHeaders,
    body: JSON.stringify({ revision: created.revision, deals: [] }),
  }));
  assert.deepEqual(removed.deals, []);

  const restored = await readJson(await fetch(`${base}/api/restore`, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Database-Revision": removed.revision,
      "X-Deal-Board": "1",
    },
    body: workbookCopy,
  }));
  assert.equal(restored.deals[0].company, "测试公司");
  assert.equal(restored.deals[0].blurb, "第一行。\nSecond line.");

  const masterPath = path.join(storageRoot, "data", "VC Deal Board.xlsx");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(masterPath);
  assert.equal(workbook.getWorksheet("Deals").getCell("B2").value, "测试公司");

  const backups = await fs.readdir(path.join(storageRoot, "backups"));
  assert.equal(backups.filter((name) => name.endsWith(".xlsx")).length, 3);

  const untrusted = await fetch(`${base}/api/deals`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deals: [] }),
  });
  assert.equal(untrusted.status, 403);

  const stale = await fetch(`${base}/api/deals`, {
    method: "PUT",
    headers: trustedHeaders,
    body: JSON.stringify({ revision: initial.revision, deals: [] }),
  });
  assert.equal(stale.status, 409);
});
