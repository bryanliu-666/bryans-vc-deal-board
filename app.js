const STORAGE_KEY = "bryans-vc-deal-board:v1";

const state = {
  deals: loadDeals(),
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
  resultCount: document.querySelector("#result-count"),
  search: document.querySelector("#search"),
  selectionCount: document.querySelector("#selection-count"),
  statusFilter: document.querySelector("#status-filter"),
  tierFilter: document.querySelector("#tier-filter"),
  toast: document.querySelector("#toast"),
};

let toastTimer;

function loadDeals() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter(isDealLike) : [];
  } catch {
    return [];
  }
}

function isDealLike(value) {
  return Boolean(value && typeof value === "object" && typeof value.company === "string");
}

function saveDeals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.deals));
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

function saveDeal(event) {
  event.preventDefault();
  if (!elements.dealForm.reportValidity()) return;
  const deal = formDeal();
  const index = state.deals.findIndex((item) => item.id === deal.id);
  if (index >= 0) state.deals[index] = deal;
  else state.deals.unshift(deal);
  saveDeals();
  closeDealDialog();
  render();
  showToast(index >= 0 ? `${deal.company} updated` : `${deal.company} added`);
}

async function deleteDeal() {
  if (!state.editingId) return;
  elements.confirmDialog.showModal();
  const result = await new Promise((resolve) => {
    elements.confirmDialog.addEventListener("close", () => resolve(elements.confirmDialog.returnValue), { once: true });
  });
  if (result !== "confirm") return;
  const deal = state.deals.find((item) => item.id === state.editingId);
  state.deals = state.deals.filter((item) => item.id !== state.editingId);
  state.selectedIds.delete(state.editingId);
  saveDeals();
  closeDealDialog();
  render();
  showToast(`${deal?.company || "Deal"} deleted`);
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
  const backup = {
    app: "Bryan's VC Deal Board",
    version: 1,
    exportedAt: new Date().toISOString(),
    deals: state.deals,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  link.href = URL.createObjectURL(blob);
  link.download = `vc-deal-board-backup-${date}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  elements.dataMenu.hidden = true;
  showToast("Backup downloaded");
}

async function importData(event) {
  const [file] = event.target.files;
  event.target.value = "";
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    const deals = Array.isArray(parsed) ? parsed : parsed.deals;
    if (!Array.isArray(deals) || !deals.every(isDealLike)) throw new Error("Invalid backup");
    state.deals = deals;
    state.selectedIds.clear();
    saveDeals();
    render();
    showToast(`${deals.length} ${deals.length === 1 ? "deal" : "deals"} restored`);
  } catch {
    showToast("This file is not a valid deal-board backup");
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

render();
