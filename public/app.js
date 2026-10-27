const $ = (s) => document.querySelector(s);
const FLOW = ["placed", "preparing", "ready", "collected"];
const META = {
  placed: { emoji: "🧾", label: "New orders" },
  preparing: { emoji: "🔥", label: "Cooking" },
  ready: { emoji: "🔔", label: "Ready!" },
  collected: { emoji: "✅", label: "Picked up" },
};
const CATEGORIES = ["Meals", "Snacks", "Drinks", "Desserts"];
const CAT_EMOJI = { All: "🍽️", Meals: "🍛", Snacks: "🍟", Drinks: "🥤", Desserts: "🍨" };

let menu = [];
let cart = new Map(); // menuId -> qty
let activeCat = "All";
let timer = null;

// ---------- helpers ----------
// tiny DOM builder: h("div", {class:"x", onclick: fn}, child1, child2)
function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  kids.flat().forEach((c) => {
    if (c == null || c === false) return;
    el.append(c.nodeType ? c : document.createTextNode(c));
  });
  return el;
}
const rs = (n) => "₹" + Number(n).toFixed(2).replace(/\.00$/, "");
const timeOf = (d) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const tag = (id) => "#" + String(id).slice(-4).toUpperCase();

async function api(url, options = {}) {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}
function toast(text, type = "") {
  const t = h("div", { class: "toast " + type }, text);
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
function say(el, text, ok) { el.textContent = text; el.className = "msg " + (ok ? "success" : "error"); }

// ---------- tabs ----------
document.querySelectorAll(".tab").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  ["order", "board", "sales"].forEach((v) => $("#view-" + v).classList.toggle("hidden", v !== name));
  clearInterval(timer);
  if (name === "board") { loadBoard(); timer = setInterval(loadBoard, 10000); } // refresh every 10 seconds
  if (name === "sales") loadSales();
  if (name === "order") loadMenu();
}

// ---------- MENU / ORDER VIEW ----------
async function loadMenu() {
  menu = await api("/api/menu");
  // drop cart lines whose item was deleted or sold out
  for (const id of [...cart.keys()]) {
    const m = menu.find((x) => x._id === id);
    if (!m || !m.available) cart.delete(id);
  }
    renderChips(); renderMenu(); renderCart();
}

function renderChips() {
  const box = $("#chips");
  box.innerHTML = "";
  ["All", ...CATEGORIES].forEach((c) =>
    box.appendChild(h("button", {
      class: "chip" + (c === activeCat ? " active" : ""),
      onclick: () => { activeCat = c; renderChips(); renderMenu(); },
    }, `${CAT_EMOJI[c]} ${c}`))
  );
}

function media(m) {
  const box = h("div", { class: "media cat-" + m.category }, h("span", { class: "big" }, m.emoji));
  if (m.image) {
    const img = h("img", { src: m.image, alt: m.name, loading: "lazy" });
    img.addEventListener("error", () => img.remove()); // broken link -> emoji stays
    box.appendChild(img);
  }
  if (!m.available) box.appendChild(h("span", { class: "badge" }, "Sold out"));
  return box;
}

function renderMenu() {
  const q = $("#search").value.trim().toLowerCase();
  const list = menu.filter((m) => (activeCat === "All" || m.category === activeCat) && m.name.toLowerCase().includes(q));
  const grid = $("#menuGrid");
  grid.innerHTML = "";
  if (!list.length) grid.appendChild(h("div", { class: "empty" }, h("span", { class: "e" }, "🥲"), "Nothing matches that. Try another word?"));
  list.forEach((m) => {
    const qty = cart.get(m._id) || 0;
    const action = !m.available ? h("small", {}, "Unavailable")
      : qty === 0 ? h("button", { class: "btn add", onclick: () => changeQty(m._id, 1) }, "Add +")
      : h("div", { class: "stepper" },
          h("button", { onclick: () => changeQty(m._id, -1) }, "−"), h("span", {}, qty),
          h("button", { onclick: () => changeQty(m._id, 1) }, "+"));
    grid.appendChild(h("div", { class: "dish" + (m.available ? "" : " off") },
      media(m),
      h("div", { class: "dish-body" },
        h("h3", {}, m.name), h("span", { class: "dish-cat" }, m.category),
        h("div", { class: "dish-foot" }, h("span", { class: "price" }, rs(m.price)), action))));
  });
}
$("#search").addEventListener("input", renderMenu);

function changeQty(id, d) {
  const n = Math.min(20, (cart.get(id) || 0) + d);
  if (n <= 0) cart.delete(id); else cart.set(id, n);
  renderMenu(); renderCart();
}

function renderCart() {
  const box = $("#cartItems");
  box.innerHTML = "";
  let total = 0;
  if (cart.size === 0) box.appendChild(h("div", { class: "empty" }, h("span", { class: "e" }, "🍽️"), "Tray's empty. Go pick something tasty!"));
  cart.forEach((qty, id) => {
    const m = menu.find((x) => x._id === id);
    if (!m) return;
    total += m.price * qty;
    box.appendChild(h("div", { class: "cart-line" },
      h("span", { class: "em" }, m.emoji),
      h("div", { class: "nm" }, m.name, h("small", {}, `${rs(m.price)} × ${qty}`)),
      h("div", { class: "stepper" },
        h("button", { onclick: () => changeQty(id, -1) }, "−"), h("span", {}, qty),
        h("button", { onclick: () => changeQty(id, 1) }, "+"))));
  });
  $("#cartTotal").textContent = rs(total);
}

$("#placeBtn").addEventListener("click", async () => {
  const msg = $("#cartMsg");
  const btn = $("#placeBtn");
  btn.disabled = true;
  try {
    const body = {
      customer: $("#customer").value,
      items: [...cart].map(([menuId, qty]) => ({ menuId, qty })), // only ids and quantities, no prices
    };
    const order = await api("/api/orders", { method: "POST", body: JSON.stringify(body) });
    cart.clear();
    $("#customer").value = "";
    renderMenu(); renderCart();
    say(msg, `Order ${tag(order._id)} sent to the kitchen! Bill: ${rs(order.total)} 🎉`, true);
    toast(`👨‍🍳 Order ${tag(order._id)} is in. Server bill: ${rs(order.total)}`, "success");
  } catch (e) {
    say(msg, e.message, false);
    loadMenu(); // menu may have changed (e.g. item sold out)
  } finally { btn.disabled = false; }
});

// ---------- KITCHEN BOARD ----------
async function loadBoard() {
  try {
    const list = await api("/api/orders");
    renderBoard(list);
    $("#lastUpdate").textContent = "updated " + new Date().toLocaleTimeString();
  } catch (e) { toast(e.message, "error"); }
}

function renderBoard(list) {
  const board = $("#board");
  board.innerHTML = "";
  FLOW.forEach((st, i) => {
    const mine = list.filter((o) => o.status === st);
    const col = h("div", { class: "col " + st },
      h("h3", {}, `${META[st].emoji} ${META[st].label}`, h("span", {}, mine.length)));
    if (!mine.length) col.appendChild(h("div", { class: "empty" }, "Nothing here"));
    mine.forEach((o) => {
      const next = FLOW[i + 1];
      col.appendChild(h("div", { class: "order" },
        h("div", { class: "order-top" }, tag(o._id), h("small", {}, `${o.customer} · ${timeOf(o.createdAt)}`)),
        h("ul", {}, o.items.map((it) => h("li", {}, `${it.emoji} ${it.qty} × ${it.name}`))),
        h("div", { class: "order-foot" }, rs(o.total),
          next ? h("button", { class: "btn", onclick: () => advance(o._id, next) }, `${META[next].emoji} ${META[next].label} →`)
               : h("span", { class: "done-tag" }, "Done ✔"))));
    });
    board.appendChild(col);
  });
}

async function advance(id, status) {
  try {
    await api(`/api/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
    toast(`${META[status].emoji} ${tag(id)} → ${META[status].label}`, "success");
  } catch (e) { toast(e.message, "error"); }
  loadBoard();
}
$("#refreshBtn").addEventListener("click", loadBoard);

// ---------- MANAGE MENU ----------
$("#mCategory").innerHTML = CATEGORIES.map((c) => `<option>${c}</option>`).join("");

function renderManage() {
  const box = $("#manageList");
  box.innerHTML = "";
  menu.forEach((m) =>
    box.appendChild(h("div", { class: "mrow" },
      h("span", { class: "em" }, m.emoji),
      h("div", { class: "info" }, h("b", {}, m.name), h("small", {}, `${m.category} · ${rs(m.price)}`)),
      h("span", { class: "pill " + (m.available ? "on" : "off") }, m.available ? "Available" : "Sold out"),
      h("div", { class: "actions" },
        h("button", { class: "btn small ghost", onclick: () => toggleAvail(m) }, m.available ? "Mark sold out" : "Mark available"),
        h("button", { class: "btn small", onclick: () => startEdit(m) }, "Edit"),
        h("button", { class: "btn small danger", onclick: () => removeItem(m) }, "Delete"))))
  );
}

function resetForm() {
  editingId = null;
  $("#menuForm").reset();
  $("#mAvail").checked = true;
  $("#formTitle").textContent = "➕ Add menu item";
  $("#saveBtn").textContent = "Save item";
}
function startEdit(m) {
  editingId = m._id;
  $("#mName").value = m.name; $("#mPrice").value = m.price; $("#mCategory").value = m.category;
  $("#mEmoji").value = m.emoji; $("#mImage").value = m.image || ""; $("#mAvail").checked = m.available;
  $("#formTitle").textContent = "✏️ Editing " + m.name;
  $("#saveBtn").textContent = "Update item";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
const formBody = () => ({
  name: $("#mName").value, price: $("#mPrice").value, category: $("#mCategory").value,
  emoji: $("#mEmoji").value, image: $("#mImage").value, available: $("#mAvail").checked,
});

$("#menuForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    const url = editingId ? `/api/menu/${editingId}` : "/api/menu";
    await api(url, { method: editingId ? "PUT" : "POST", body: JSON.stringify(formBody()) });
    say($("#menuMsg"), editingId ? "Item updated ✔" : "Item added ✔", true);
    resetForm();
    loadMenu();
  } catch (err) { say($("#menuMsg"), err.message, false); }
});
$("#cancelEdit").addEventListener("click", () => { resetForm(); $("#menuMsg").textContent = ""; });

async function toggleAvail(m) {
  try {
    await api(`/api/menu/${m._id}`, { method: "PUT", body: JSON.stringify({ ...m, available: !m.available }) });
    loadMenu();
  } catch (e) { toast(e.message, "error"); }
}
async function removeItem(m) {
  if (!confirm(`Take "${m.name}" off the menu?`)) return;
  try { await api(`/api/menu/${m._id}`, { method: "DELETE" }); toast("Item removed"); loadMenu(); }
  catch (e) { toast(e.message, "error"); }
}

// ---------- TAKINGS (sales) ----------
async function loadSales() {
  try {
    const s = await api("/api/stats/today");
    $("#salesDate").textContent = s.date;
    const avg = s.orders ? s.sales / s.orders : 0;
    const cards = $("#salesCards");
    cards.innerHTML = "";
    [["a", "💰", rs(s.sales), "total takings today"], ["b", "🧾", s.orders, "orders today"], ["c", "📈", rs(avg), "average bill"]]
      .forEach(([c, e, v, l]) => cards.appendChild(h("div", { class: "stat " + c }, h("span", { class: "e" }, e), h("b", {}, v), h("span", {}, l))));

    const top = $("#topItems");
    top.innerHTML = "";
    const max = Math.max(1, ...s.topItems.map((i) => i.qty));
    if (!s.topItems.length) top.appendChild(h("div", { class: "empty" }, "No orders yet today"));
    s.topItems.forEach((i) => top.appendChild(h("div", { class: "bar-row" },
      h("span", { class: "lbl" }, `${i.emoji} ${i.name}`),
      h("div", { class: "bar" }, h("i", { style: `width:${(i.qty / max) * 100}%` })),
      h("span", { class: "n" }, i.qty))));

    const sb = $("#statusBars");
    sb.innerHTML = "";
    const maxS = Math.max(1, ...FLOW.map((f) => s.byStatus[f] || 0));
    FLOW.forEach((f) => sb.appendChild(h("div", { class: "bar-row" },
      h("span", { class: "lbl" }, `${META[f].emoji} ${META[f].label}`),
      h("div", { class: "bar" }, h("i", { style: `width:${((s.byStatus[f] || 0) / maxS) * 100}%` })),
      h("span", { class: "n" }, s.byStatus[f] || 0))));
  } catch (e) { toast(e.message, "error"); }
}

// ---------- start ----------
loadMenu().catch((e) => toast(e.message, "error"));