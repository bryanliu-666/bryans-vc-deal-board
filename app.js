const LEGACY_STORAGE_KEY = "bryans-vc-deal-board:v1";

const state = {
  deals: [],
  revision: null,
  loaded: false,
  saving: false,
  selectedIds: new Set(),
  editingId: null,
  query: "",
  status: "",
  tier: "",
};

const elements = {
  addDeal: document.querySelector("#add-deal"),
  clearFilters: document.querySelector("#clear-filters"),
  clearSearch: document.querySelector("#clear-search"),
  confirmDialog: document.querySelector("#confirm-dialog"),
  copySelected: document.querySelector("#copy-selected"),
  dataMenu: document.querySelector("#data-menu"),
  dataMenuButton: document.querySelector("#data-menu-button"),
  dealDialog: document.querySelector("#deal-dialog"),
  dealForm: document.querySelector("#deal-form"),
  dealGrid: document.querySelector("#deal-grid"),
  deleteDeal: document.querySelector("#delete-deal"),
  dialogEyebrow: document.querySelector("#dialog-eyebrow"),
  dialogTitle: document.querySelector("#dialog-title"),
  emptyTemplate: document.querySelector("#empty-template"),
  exportData: document.querySelector("#export-data"),
  importData: document.querySelector("#import-data"),
  importFile: document.querySelector("#import-file"),
  openDataFolder: document.querySelector("#open-data-folder"),
  resultCount: document.querySelector("#result-count"),
  search: document.querySelector("#search"),
  selectionCount: document.querySelector("#selection-count"),
  statusFilter: document.querySelector("#status-filter"),
  tierFilter: document.querySelector("#tier-filter"),
  toast: document.querySelector("#toast"),
};

let toastTimer;

function isDealLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.company === "string");
}

async function requestJson(url, options) {
  const requestOptions = { ...(options || {}) };
  const method = String(requestOptions.method || "GET").toUpperCase();
  const headers = new Headers(requestOptions.headers || {});
  if (method !== "GET" && method !== "HEAD") headers.set("X-Deal-Board", "1");
  requestOptions.headers = headers;
  const response = await fetch(url, requestOptions);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || "The local database could not be updated.");
    error.status = response.status;
    throw error;
  }
  return data;
}

async function persistDeals(deals) {
  return requestJson("/api/deals", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deals, revision: state.revision }),
  });
}

async function initialize() {
  try {
    const data = await requestJson("/api/deals");
    state.deals = data.deals;
    state.revision = data.revision;

    const legacy = readLegacyBrowserDeals();
    if (!state.deals.length && legacy.length) {
      const migrated = await persistDeals(legacy);
      state.deals = migrated.deals;
      state.revision = migrated.revision;
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      showToast("Your browser deals were moved into the Excel database");
    }

    state.loaded = true;
    elements.addDeal.disabled = false;
    render();
  } catch (error) {
    renderStartupError(error.message);
  }
}

function readLegacyBrowserDeals() {
  try {
    const value = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(isDealLike) : [];
  } catch {
    return [];
  }
}

function renderStartupError(message) {
  elements.dealGrid.replaceChildren();
  const empty = elements.emptyTemplate.content.cloneNode(true);
  empty.querySelector("h2").textContent = "The local database is not running";
  empty.querySelector("p").textContent = "Close this page, then open Start Deal Board again from the project folder.";
  const button = empty.querySelector("[data-empty-add]");
  button.textContent = "Try again";
  button.addEventListener("click", () => window.location.reload());
  elements.dealGrid.append(empty);
  elements.resultCount.textContent = message || "Could not reach the local database";
}

function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function cleanLine(value) {
  return value.replace(/^\s*[-*\u2022]+\s*/, "").trim();
}

function createId() {
  return crypto.randomUUID?.() || `deal-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function blurbLines(value) {
  return value
    .split(/\r?\n/)
    .map(cleanLine)
    .filter(Boolean);
}

function statusClass(value) {
  return value.toLowerCase().replaceAll(" ", "-");
}

function dealSearchText(deal) {
  return [
    deal.company,
    deal.website,
    deal.oneLiner,
    deal.stage,
    deal.raisingStatus,
    deal.roundSize,
    deal.valuation,
    deal.leadInvestor,
    deal.blurb,
    ...(deal.tags || []),
  ]
    .join(" ")
    .toLowerCase();
}

function visibleDeals() {
  const query = state.query.trim().toLowerCase();
  return state.deals
    .filter((deal) => !query || dealSearchText(deal).includes(query))
    .filter((deal) => !state.status || deal.raisingStatus === state.status)
    .filter((deal) => !state.tier || String(deal.tier) === state.tier)
    .sort((a, b) => Number(a.tier || 9) - Number(b.tier || 9) || a.company.localeCompare(b.company));
}

function render() {
  const deals = visibleDeals();
  elements.dealGrid.replaceChildren();

  if (!deals.length) {
    const empty = elements.emptyTemplate.content.cloneNode(true);
    const hasFilters = Boolean(state.query || state.status || state.tier);
    if (hasFilters) {
      empty.querySelector("h2").textContent = "No matching deals";
      empty.querySelector("p").textContent = "Try another search or clear the filters.";
      const button = empty.querySelector("[data-empty-add]");
      button.textContent = "Clear filters";
      button.addEventListener("click", clearFilters);
    } else {
      empty.querySelector("[data-empty-add]").addEventListener("click", () => openDealDialog());
    }
    elements.dealGrid.append(empty);
  } else {
    deals.forEach((deal) => elements.dealGrid.append(createDealCard(deal)));
  }

  const countLabel = `${deals.length} ${deals.length === 1 ? "deal" : "deals"}`;
  elements.resultCount.textContent = state.deals.length === deals.length
    ? countLabel
    : `${countLabel} of ${state.deals.length}`;
  elements.clearFilters.hidden = !(state.query || state.status || state.tier);
  elements.clearSearch.hidden = !state.query;
  renderSelection();
}

function createDealCard(deal) {
  const article = document.createElement("article");
  article.className = `deal-card${state.selectedIds.has(deal.id) ? " selected" : ""}`;
  article.dataset.id = deal.id;

  const inner = document.createElement("div");
  inner.className = "card-inner";

  const header = document.createElement("div");
  header.className = "card-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "card-title-wrap";
  const companyLink = document.createElement(deal.website ? "a" : "span");
  companyLink.className = "company-link";
  if (deal.website) {
    companyLink.href = deal.website;
    companyLink.target = "_blank";
    companyLink.rel = "noreferrer";
  }
  const companyName = document.createElement("span");
  companyName.textContent = deal.company;
  companyLink.append(companyName);
  if (deal.website) {
    const external = document.createElement("span");
    external.className = "external-mark";
    external.setAttribute("aria-hidden", "true");
    external.textContent = "\u2197";
    companyLink.append(external);
  }
  titleWrap.append(companyLink);

  const actions = document.createElement("div");
  actions.className = "card-actions";
  const selectLabel = document.createElement("label");
  selectLabel.className = "select-check";
  selectLabel.title = "Select for copying";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = state.selectedIds.has(deal.id);
  checkbox.setAttribute("aria-label", `Select ${deal.company}`);
  checkbox.addEventListener("change", () => toggleSelected(deal.id));
  selectLabel.append(checkbox, document.createElement("span"));

  const editButton = document.createElement("button");
  editButton.className = "icon-button";
  editButton.type = "button";
  editButton.title = "Edit deal";
  editButton.setAttribute("aria-label", `Edit ${deal.company}`);
  editButton.textContent = "\u22ef";
  editButton.addEventListener("click", () => openDealDialog(deal.id));
  actions.append(selectLabel, editButton);
  header.append(titleWrap, actions);
  inner.append(header);

  const oneLiner = document.createElement("p");
  oneLiner.className = deal.oneLiner ? "one-liner" : "one-liner empty-copy";
  oneLiner.textContent = deal.oneLiner || "No one-liner yet";
  inner.append(oneLiner);

  const metaRow = document.createElement("div");
  metaRow.className = "meta-row";
  [
    [deal.raisingStatus || "Unknown", `pill ${statusClass(deal.raisingStatus || "Unknown")}`],
    [deal.stage, "pill"],
    [`Tier ${deal.tier || 2}`, "pill"],
  ].forEach(([text, className]) => {
    if (!text) return;
    const pill = document.createElement("span");
    pill.className = className;
    pill.textContent = text;
    metaRow.append(pill);
  });
  inner.append(metaRow);

  const facts = document.createElement("dl");
  facts.className = "deal-facts";
  [
    ["Round", deal.roundSize],
    ["Valuation", deal.valuation],
    ["Lead", deal.leadInvestor],
  ].forEach(([label, value]) => {
    const wrap = document.createElement("div");
    const term = document.createElement("dt");
    const description = document.createElement("dd");
    term.textContent = label;
    description.textContent = value || "\u2014";
    description.title = value || "";
    wrap.append(term, description);
    facts.append(wrap);
  });
  inner.append(facts);

  const lines = blurbLines(deal.blurb || "");
  if (lines.length) {
    const list = document.createElement("ul");
    list.className = "blurb-list";
    lines.forEach((line) => {
      const item = document.createElement("li");
      item.textContent = line;
      list.append(item);
    });
    inner.append(list);
  } else {
    const emptyBlurb = document.createElement("p");
    emptyBlurb.className = "one-liner empty-copy";
    emptyBlurb.textContent = "No shareable blurb yet";
    inner.append(emptyBlurb);
  }

  if (deal.tags?.length) {
    const tags = document.createElement("div");
    tags.className = "tag-row";
    deal.tags.forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = tag;
      tags.append(pill);
    });
    inner.append(tags);
  }

  article.append(inner);
  return article;
}

function renderSelection() {
  const count = state.selectedIds.size;
  elements.selectionCount.textContent = String(count);
  elements.copySelected.disabled = count === 0;
  document.querySelectorAll(".deal-card").forEach((card) => {
    card.classList.toggle("selected", state.selectedIds.has(card.dataset.id));
  });
}

function toggleSelected(id) {
  if (state.selectedIds.has(id)) state.selectedIds.delete(id);
  else state.selectedIds.add(id);
  renderSelection();
}

function openDealDialog(id = null) {
  state.editingId = id;
  elements.dealForm.reset();
  const deal = id ? state.deals.find((item) => item.id === id) : null;
  elements.dialogEyebrow.textContent = deal ? "Edit deal" : "New deal";
  elements.dialogTitle.textContent = deal ? deal.company : "Add a deal";
  elements.deleteDeal.hidden = !deal;

  if (deal) {
    const fields = elements.dealForm.elements;
    fields.company.value = deal.company || "";
    fields.website.value = deal.website || "";
    fields.oneLiner.value = deal.oneLiner || "";
    fields.stage.value = deal.stage || "";
    fields.raisingStatus.value = deal.raisingStatus || "Unknown";
    fields.roundSize.value = deal.roundSize || "";
    fields.valuation.value = deal.valuation || "";
    fields.leadInvestor.value = deal.leadInvestor || "";
    fields.tier.value = String(deal.tier || 2);
    fields.tags.value = (deal.tags || []).join(", ");
    fields.blurb.value = deal.blurb || "";
  }

  elements.dealDialog.showModal();
  requestAnimationFrame(() => elements.dealForm.elements.company.focus());
}

function closeDealDialog() {
  elements.dealDialog.close();
  state.editingId = null;
}

function formDeal() {
  const data = new FormData(elements.dealForm);
  const now = new Date().toISOString();
  const existing = state.deals.find((deal) => deal.id === state.editingId);
  return {
    id: existing?.id || createId(),
    company: String(data.get("company") || "").trim(),
    website: normalizeUrl(String(data.get("website") || "")),
    oneLiner: String(data.get("oneLiner") || "").trim(),
    stage: String(data.get("stage") || "").trim(),
    raisingStatus: String(data.get("raisingStatus") || "Unknown"),
    roundSize: String(data.get("roundSize") || "").trim(),
    valuation: String(data.get("valuation") || "").trim(),
    leadInvestor: String(data.get("leadInvestor") || "").trim(),
    tier: Number(data.get("tier") || 2),
    tags: String(data.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    blurb: String(data.get("blurb") || "").trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

async function saveDeal(event) {
  event.preventDefault();
  if (!elements.dealForm.reportValidity() || state.saving) return;
  const deal = formDeal();
  const index = state.deals.findIndex((item) => item.id === deal.id);
  const nextDeals = [...state.deals];
  if (index >= 0) nextDeals[index] = deal;
  else nextDeals.unshift(deal);

  setSaving(true);
  try {
    const saved = await persistDeals(nextDeals);
    state.deals = saved.deals;
    state.revision = saved.revision;
    closeDealDialog();
    render();
    showToast(index >= 0 ? `${deal.company} updated in Excel` : `${deal.company} added to Excel`);
  } catch (error) {
    showToast(error.message);
  } finally {
    setSaving(false);
  }
}

async function deleteDeal() {
  if (!state.editingId) return;
  elements.confirmDialog.showModal();
  const result = await new Promise((resolve) => {
    elements.confirmDialog.addEventListener("close", () => resolve(elements.confirmDialog.returnValue), { once: true });
  });
  if (result !== "confirm") return;
  const deal = state.deals.find((item) => item.id === state.editingId);
  const nextDeals = state.deals.filter((item) => item.id !== state.editingId);
  setSaving(true);
  try {
    const saved = await persistDeals(nextDeals);
    state.deals = saved.deals;
    state.revision = saved.revision;
    state.selectedIds.delete(state.editingId);
    closeDealDialog();
    render();
    showToast(`${deal?.company || "Deal"} deleted; an Excel backup was saved`);
  } catch (error) {
    showToast(error.message);
  } finally {
    setSaving(false);
  }
}

function setSaving(value) {
  state.saving = value;
  const submit = elements.dealForm.querySelector('button[type="submit"]');
  submit.disabled = value;
  submit.textContent = value ? "Saving..." : "Save deal";
  elements.deleteDeal.disabled = value;
}

function clearFilters() {
  state.query = "";
  state.status = "";
  state.tier = "";
  elements.search.value = "";
  elements.statusFilter.value = "";
  elements.tierFilter.value = "";
  render();
}

function plainDeal(deal) {
  const title = deal.website ? `${deal.company} (${deal.website})` : deal.company;
  const parts = [title];
  if (deal.oneLiner) parts.push(deal.oneLiner);
  const lines = blurbLines(deal.blurb || "");
  if (lines.length) parts.push(lines.map((line) => `\u2022 ${line}`).join("\n"));
  return parts.join("\n");
}

function richDeal(deal) {
  const title = deal.website
    ? `<strong><a href="${escapeHtml(deal.website)}">${escapeHtml(deal.company)}</a></strong>`
    : `<strong>${escapeHtml(deal.company)}</strong>`;
  const oneLiner = deal.oneLiner ? `<div><em>${escapeHtml(deal.oneLiner)}</em></div>` : "";
  const lines = blurbLines(deal.blurb || "");
  const blurb = lines.length ? `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>` : "";
  return `<div>${title}${oneLiner}${blurb}</div>`;
}

function escapeHtml(value) {
  const node = document.createElement("div");
  node.textContent = value;
  return node.innerHTML;
}

async function copySelectedDeals() {
  const deals = state.deals.filter((deal) => state.selectedIds.has(deal.id));
  const plain = deals.map(plainDeal).join("\n\n");
  const rich = deals.map(richDeal).join("<br>");
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([rich], { type: "text/html" }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(plain);
    }
    showToast(`${deals.length} ${deals.length === 1 ? "deal" : "deals"} copied`);
  } catch {
    showToast("Copy failed. Your browser may require HTTPS.");
  }
}

function toggleDataMenu() {
  const shouldOpen = elements.dataMenu.hidden;
  elements.dataMenu.hidden = !shouldOpen;
  if (!shouldOpen) return;
  const rect = elements.dataMenuButton.getBoundingClientRect();
  const menuWidth = 264;
  elements.dataMenu.style.top = `${rect.bottom + 7}px`;
  elements.dataMenu.style.left = `${Math.max(12, rect.right - menuWidth)}px`;
}

function exportData() {
  const link = document.createElement("a");
  link.href = "/api/database";
  link.download = "VC Deal Board.xlsx";
  document.body.append(link);
  link.click();
  link.remove();
  elements.dataMenu.hidden = true;
  showToast("Excel copy downloaded");
}

async function importData(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const restored = await requestJson("/api/restore", {
      method: "POST",
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Database-Revision": state.revision,
      },
      body: file,
    });
    state.deals = restored.deals;
    state.revision = restored.revision;
    state.selectedIds.clear();
    render();
    showToast(`${restored.deals.length} ${restored.deals.length === 1 ? "deal" : "deals"} restored from Excel`);
  } catch (error) {
    showToast(error.message || "This is not a valid Deal Board Excel file");
  }
}

async function openDataFolder() {
  try {
    await requestJson("/api/open-data-folder", { method: "POST" });
    elements.dataMenu.hidden = true;
  } catch (error) {
    showToast(error.message);
  }
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  toastTimer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 3500);
}

elements.addDeal.addEventListener("click", () => openDealDialog());
elements.clearFilters.addEventListener("click", clearFilters);
elements.clearSearch.addEventListener("click", () => {
  state.query = "";
  elements.search.value = "";
  elements.search.focus();
  render();
});
elements.copySelected.addEventListener("click", copySelectedDeals);
elements.dataMenuButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleDataMenu();
});
elements.exportData.addEventListener("click", exportData);
elements.openDataFolder.addEventListener("click", openDataFolder);
elements.importData.addEventListener("click", () => elements.importFile.click());
elements.importFile.addEventListener("change", importData);
elements.dealForm.addEventListener("submit", saveDeal);
elements.deleteDeal.addEventListener("click", deleteDeal);
document.querySelector("#close-dialog").addEventListener("click", closeDealDialog);
document.querySelector("#cancel-dialog").addEventListener("click", closeDealDialog);

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});
elements.search.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    state.query = "";
    elements.search.value = "";
    render();
  }
});
elements.statusFilter.addEventListener("change", (event) => {
  state.status = event.target.value;
  render();
});
elements.tierFilter.addEventListener("change", (event) => {
  state.tier = event.target.value;
  render();
});

elements.dealDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDealDialog();
});
elements.dealDialog.addEventListener("click", (event) => {
  if (event.target === elements.dealDialog) event.preventDefault();
});

document.addEventListener("click", (event) => {
  if (!elements.dataMenu.hidden && !elements.dataMenu.contains(event.target)) {
    elements.dataMenu.hidden = true;
  }
});

initialize();
