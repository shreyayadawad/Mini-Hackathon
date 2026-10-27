// Campus Canteen frontend integration for public/index.html
const $ = (selector, root = document) => root.querySelector(selector);
const FLOW = ["placed", "preparing", "ready", "collected"];
const LABEL = { placed: "Preparing", preparing: "Ready", ready: "Collected" };
let menu = [], cart = new Map(), activeCategory = "all", editingId = null;

const money = value => "₹" + Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const text = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
const clone = id => $(id).content.firstElementChild.cloneNode(true);
async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "Request failed (" + response.status + ")");
  return data;
}
function toast(message) {
  const container = $("#toasts");
  const element = document.createElement("div");
  element.className = "toast";
  element.textContent = message;
  container.append(element);
  setTimeout(() => element.remove(), 4000);
}
function showError(error) { console.error(error); toast(error.message || String(error)); }
function itemById(id) { return menu.find(item => item._id === id); }
function total() { return [...cart].reduce((sum, [id, qty]) => sum + (itemById(id)?.price || 0) * qty, 0); }
function openCart() { $("#cart").classList.add("is-open", "open"); $("#cart-backdrop").hidden = false; }
function closeCart() { $("#cart").classList.remove("is-open", "open"); $("#cart-backdrop").hidden = true; }

async function loadMenu() {
  try {
    menu = await api("/api/menu");
    if (!Array.isArray(menu)) throw new Error("Menu response must be an array");
    for (const id of cart.keys()) if (!itemById(id)?.available) cart.delete(id);
    renderFilters(); renderMenu(); renderCart(); renderManage();
  } catch (error) { text("#menu-grid", "Unable to load menu: " + error.message); showError(error); }
}
function renderFilters() {
  const box = $("#category-filters");
  box.replaceChildren();
  const categories = ["all", ...new Set(menu.map(item => item.category))];
  for (const category of categories) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip" + (activeCategory === category ? " is-active active" : "");
    button.textContent = category === "all" ? "All" : category;
    button.dataset.category = category;
    button.addEventListener("click", () => { activeCategory = category; renderFilters(); renderMenu(); });
    box.append(button);
  }
}
function changeQty(id, delta) {
  const next = Math.min(20, (cart.get(id) || 0) + delta);
  if (next <= 0) cart.delete(id); else cart.set(id, next);
  renderMenu(); renderCart();
}
function renderMenu() {
  const grid = $("#menu-grid"); grid.replaceChildren();
  const shown = menu.filter(item => activeCategory === "all" || item.category === activeCategory);
  if (!shown.length) { grid.textContent = "No dishes in this category."; return; }
  for (const item of shown) {
    const card = clone("#tpl-menu-card");
    $(".menu-card__name", card).textContent = item.name;
    $(".menu-card__cat", card).textContent = item.category;
    $(".price", card).textContent = money(item.price);
    $(".menu-card__emoji", card).textContent = item.emoji || "🍽️";
    const img = $(".menu-card__img", card);
    if (item.image) { img.src = item.image; img.alt = item.name; img.onerror = () => img.remove(); }
    else img.remove();
    if (item.available) $(".menu-card__badge", card).remove();
    else card.classList.add("is-sold-out");
    const button = $(".btn--add", card);
    button.disabled = !item.available;
    button.textContent = !item.available ? "Sold out" : cart.has(item._id) ? "Add more +" : "Add +";
    button.addEventListener("click", () => changeQty(item._id, 1));
    grid.append(card);
  }
}
function renderCart() {
  const list = $("#cart-items"); list.replaceChildren();
  let count = 0;
  for (const [id, qty] of cart) {
    const item = itemById(id); if (!item) continue;
    count += qty;
    const row = clone("#tpl-cart-row");
    $(".cart-row__emoji", row).textContent = item.emoji || "🍽️";
    $(".cart-row__name", row).textContent = item.name;
    $(".cart-row__sub", row).textContent = money(item.price) + " × " + qty;
    $(".stepper__qty", row).textContent = qty;
    $('[data-act="dec"]', row).addEventListener("click", () => changeQty(id, -1));
    $('[data-act="inc"]', row).addEventListener("click", () => changeQty(id, 1));
    list.append(row);
  }
  $("#cart-empty").hidden = count > 0;
  text("#cart-total", money(total()));
  text("#cart-bar-total", money(total()));
  text("#cart-count", count);
  $("#place-order").disabled = count === 0;
}
$("#cart-toggle").addEventListener("click", openCart);
$("#cart-close").addEventListener("click", closeCart);
$("#cart-backdrop").addEventListener("click", closeCart);
$("#place-order").addEventListener("click", async () => {
  const button = $("#place-order"), customer = $("#customer").value.trim();
  if (!customer) { text("#order-msg", "Enter your name first."); return; }
  if (!cart.size) return;
  button.disabled = true;
  try {
    const order = await api("/api/orders", { method: "POST", body: JSON.stringify({
      customer, items: [...cart].map(([menuId, qty]) => ({ menuId, qty }))
    }) });
    cart.clear(); renderCart(); renderMenu(); closeCart();
    text("#order-msg", "Order #" + order._id.slice(-6).toUpperCase() + " placed! Total " + money(order.total));
    toast("Order placed successfully!");
    await Promise.all([loadOrders(), loadStats()]);
    location.hash = "#orders";
  } catch (error) { text("#order-msg", error.message); showError(error); }
  finally { button.disabled = cart.size === 0; }
});

async function loadOrders() {
  try {
    const orders = await api("/api/orders");
    for (const status of FLOW) {
      const list = $("#col-" + status); list.replaceChildren();
      const selected = orders.filter(order => order.status === status);
      text("#count-" + status, selected.length);
      for (const order of selected) {
        const card = clone("#tpl-order-card");
        $(".order-card__who", card).textContent = order.customer + " · #" + order._id.slice(-6).toUpperCase();
        $(".order-card__time", card).textContent = new Date(order.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const items = $(".order-card__items", card);
        for (const line of order.items || []) {
          const li = document.createElement("li");
          li.textContent = (line.emoji || "🍽️") + " " + line.qty + " × " + line.name;
          items.append(li);
        }
        $(".order-card__total", card).textContent = money(order.total);
        const button = $(".btn--advance", card);
        const next = FLOW[FLOW.indexOf(status) + 1];
        if (next) {
          button.textContent = "Mark " + LABEL[status] + " →";
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await api("/api/orders/" + order._id + "/status", { method: "PATCH", body: JSON.stringify({ status: next }) });
              await Promise.all([loadOrders(), loadStats()]);
            } catch (error) { showError(error); button.disabled = false; }
          });
        } else { button.textContent = "Collected ✓"; button.disabled = true; }
        list.append(card);
      }
    }
  } catch (error) { showError(error); }
}
async function loadStats() {
  try {
    const stats = await api("/api/stats/today");
    text("#stat-sales", money(stats.sales));
    text("#stat-orders", stats.orders);
    text("#hero-preparing", stats.byStatus?.preparing || 0);
    text("#hero-ready", stats.byStatus?.ready || 0);
    const top = $("#top-items"); top.replaceChildren();
    if (!stats.topItems?.length) {
      const li = document.createElement("li"); li.textContent = "No sales yet."; top.append(li);
    } else for (const item of stats.topItems) {
      const li = document.createElement("li"), label = document.createElement("span"), qty = document.createElement("b");
      label.textContent = (item.emoji || "🍽️") + " " + item.name; qty.textContent = item.qty;
      li.append(label, qty); top.append(li);
    }
  } catch (error) { showError(error); }
}
function renderManage() {
  const list = $("#manage-list"); list.replaceChildren();
  for (const item of menu) {
    const row = clone("#tpl-manage-row");
    $(".manage-row__emoji", row).textContent = item.emoji || "🍽️";
    $(".manage-row__name", row).textContent = item.name;
    $(".manage-row__meta", row).textContent = item.category + " · " + money(item.price);
    const toggle = $('[data-act="toggle"]', row);
    toggle.textContent = item.available ? "Mark sold out" : "Mark available";
    toggle.addEventListener("click", () => saveMenuItem(item._id, { available: !item.available }));
    $('[data-act="edit"]', row).addEventListener("click", () => openEditor(item));
    $('[data-act="delete"]', row).addEventListener("click", async () => {
      if (!confirm("Delete " + item.name + "?")) return;
      try { await api("/api/menu/" + item._id, { method: "DELETE" }); await loadMenu(); toast("Item deleted"); }
      catch (error) { showError(error); }
    });
    list.append(row);
  }
}
function openEditor(item = null) {
  editingId = item?._id || null;
  $("#item-form").reset();
  text("#dialog-title", item ? "Edit item" : "Add item");
  text("#item-msg", "");
  $("#item-id").value = editingId || "";
  $("#item-name").value = item?.name || "";
  $("#item-price").value = item?.price ?? "";
  $("#item-category").value = item?.category || "";
  $("#item-emoji").value = item?.emoji || "";
  $("#item-image").value = item?.image || "";
  $("#item-available").checked = item?.available ?? true;
  const datalist = $("#category-list"); datalist.replaceChildren();
  for (const category of new Set(menu.map(i => i.category))) {
    const option = document.createElement("option"); option.value = category; datalist.append(option);
  }
  $("#item-dialog").showModal();
}
async function saveMenuItem(id, body) {
  try {
    await api(id ? "/api/menu/" + id : "/api/menu", {
      method: id ? "PUT" : "POST", body: JSON.stringify(body)
    });
    await loadMenu(); toast("Menu saved");
  } catch (error) { showError(error); throw error; }
}
$("#add-item").addEventListener("click", () => openEditor());
$("#item-cancel").addEventListener("click", () => $("#item-dialog").close());
$("#item-form").addEventListener("submit", async event => {
  event.preventDefault();
  const body = {
    name: $("#item-name").value.trim(),
    price: Number($("#item-price").value),
    category: $("#item-category").value.trim(),
    emoji: $("#item-emoji").value.trim(),
    image: $("#item-image").value.trim(),
    available: $("#item-available").checked
  };
  try { await saveMenuItem(editingId, body); $("#item-dialog").close(); }
  catch (error) { text("#item-msg", error.message); }
});
loadMenu();
loadOrders();
loadStats();
setInterval(() => { loadOrders(); loadStats(); }, 15000);
