const app = document.getElementById("app");
const money = (value) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(value);

function toast(message) {
  document.querySelectorAll(".toast").forEach((node) => node.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2400);
}

function navigate(path) {
  if (location.pathname + location.search === path) {
    render();
    return;
  }
  history.pushState({}, "", path);
  render();
}

document.addEventListener("click", (event) => {
  const link = event.target.closest("[data-link]");
  if (!link) return;
  const url = new URL(link.href, location.origin);
  if (url.origin !== location.origin) return;
  event.preventDefault();
  navigate(`${url.pathname}${url.search}${url.hash}`);
});

window.addEventListener("popstate", render);

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (res.status === 204) return { status: res.status, headers: res.headers, body: null };
  const body = await res.json().catch(() => ({}));
  return { status: res.status, headers: res.headers, body };
}

function setActiveNav() {
  const path = location.pathname;
  document.querySelectorAll(".nav a").forEach((anchor) => {
    const href = new URL(anchor.getAttribute("href"), location.origin).pathname;
    anchor.classList.toggle("is-active", href !== "/" && path.startsWith(href));
  });
}

function formatPKR(n) {
  return money(Number(n) || 0);
}

async function renderHome() {
  const [featured, categories] = await Promise.all([
    api("/api/v1/products?limit=8"),
    api("/api/v1/categories"),
  ]);
  const cats = categories.body || [];
  const products = (featured.body || []).slice(0, 8);
  app.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Node.js · Express · REST</p>
      <h1>Commerce on its true axis.</h1>
      <p class="lede">
        MEHVAR is a local Express catalog: noun-based URLs, honest HTTP status codes, idempotent PUT,
        and <code>?fields=title,price</code> so clients never over-fetch.
      </p>
      <div class="hero-actions">
        <a class="btn btn-primary" href="/catalog" data-link>Shop the catalog</a>
        <a class="btn btn-ghost" href="/docs" data-link>Open the API lab</a>
      </div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Departments</p>
          <h2>Five aisles, twelve products each</h2>
        </div>
        <a class="btn btn-ghost" href="/catalog" data-link>View all</a>
      </div>
      <div class="category-grid">
        ${cats
          .map(
            (cat) => `
          <a class="cat-card" href="/catalog?category=${encodeURIComponent(cat.slug)}" data-link>
            <img src="${cat.image}" alt="${cat.name}" />
            <div class="body">
              <p class="kicker">${cat.count} products</p>
              <h3>${cat.name}</h3>
            </div>
          </a>`,
          )
          .join("")}
      </div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p class="eyebrow">Catalog</p>
          <h2>From the floor</h2>
        </div>
      </div>
      ${productGrid(products)}
    </section>
  `;
}

function productGrid(products) {
  if (!products.length) return `<div class="empty">No products match those filters.</div>`;
  return `<div class="product-grid">${products
    .map(
      (p) => `
    <a class="product-card" href="/product/${p.id}" data-link>
      <img src="${p.image}" alt="${p.title}" />
      <div class="body">
        <p class="kicker">${p.category}</p>
        <h3>${p.title}</h3>
        <p class="price">${formatPKR(p.price)}</p>
      </div>
    </a>`,
    )
    .join("")}</div>`;
}

async function renderCatalog() {
  const params = new URLSearchParams(location.search);
  const category = params.get("category") || "";
  const search = params.get("search") || "";
  const page = Number(params.get("page") || 1);
  const query = new URLSearchParams({ page: String(page), limit: "12" });
  if (category) query.set("category", category);
  if (search) query.set("search", search);

  const [list, catsRes] = await Promise.all([
    api(`/api/v1/products?${query.toString()}`),
    api("/api/v1/categories"),
  ]);
  const products = list.body || [];
  const total = Number(list.headers.get("X-Total-Count") || products.length);
  const totalPages = Number(list.headers.get("X-Total-Pages") || 1);
  const cats = catsRes.body || [];

  app.innerHTML = `
    <p class="eyebrow">Catalog</p>
    <h1>The floor</h1>
    <p class="muted">Filter by department or search the REST catalog directly.</p>
    <div class="chip-row">
      <button class="chip ${category === "" ? "is-active" : ""}" data-cat="">All</button>
      ${cats
        .map(
          (cat) =>
            `<button class="chip ${category === cat.slug ? "is-active" : ""}" data-cat="${cat.slug}">${cat.name}</button>`,
        )
        .join("")}
    </div>
    <form class="toolbar" id="filter-form">
      <input name="search" value="${escapeHtml(search)}" placeholder="Search headphones, linen, attar…" />
      <button class="btn btn-primary" type="submit">Search</button>
      <a class="btn btn-ghost" href="/catalog" data-link>Reset</a>
    </form>
    ${productGrid(products)}
    <div class="pager">
      <button class="btn btn-ghost" id="prev" ${page <= 1 ? "disabled" : ""}>Previous</button>
      <p class="muted">Page ${page} of ${Math.max(totalPages, 1)} · ${total} products</p>
      <button class="btn btn-ghost" id="next" ${page >= totalPages ? "disabled" : ""}>Next</button>
    </div>
  `;

  app.querySelectorAll("[data-cat]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const next = new URLSearchParams();
      if (btn.dataset.cat) next.set("category", btn.dataset.cat);
      if (search) next.set("search", search);
      navigate(`/catalog${next.toString() ? `?${next}` : ""}`);
    });
  });
  app.querySelector("#filter-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    const value = event.target.search.value.trim();
    if (value) next.set("search", value);
    navigate(`/catalog${next.toString() ? `?${next}` : ""}`);
  });
  app.querySelector("#prev").addEventListener("click", () => changePage(page - 1));
  app.querySelector("#next").addEventListener("click", () => changePage(page + 1));

  function changePage(nextPage) {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (search) next.set("search", search);
    next.set("page", String(nextPage));
    navigate(`/catalog?${next}`);
  }
}

async function renderProduct(id) {
  const res = await api(`/api/v1/products/${id}`);
  if (res.status !== 200) {
    app.innerHTML = `<div class="error-box"><h2>Product not found</h2><p>${res.body.message || "Missing product."}</p></div>`;
    return;
  }
  const p = res.body;
  app.innerHTML = `
    <div class="detail">
      <div class="detail-media">
        <img src="${p.image}" alt="${escapeHtml(p.title)}" />
      </div>
      <div class="detail-copy">
        <p class="kicker">${escapeHtml(p.category)} · ${escapeHtml(p.brand || "MEHVAR")}</p>
        <h1>${escapeHtml(p.title)}</h1>
        <p class="price" style="margin-top:16px;font-size:1.4rem">${formatPKR(p.price)}</p>
        <p class="stock ${p.stock === 0 ? "out" : ""}">${p.stock} in stock · SKU ${escapeHtml(p.sku)}</p>
        <p class="lede">${escapeHtml(p.description)}</p>
        <div class="hero-actions">
          <a class="btn btn-ghost" href="/catalog" data-link>Back to catalog</a>
          <a class="btn btn-primary" href="/studio" data-link>Edit in Studio</a>
        </div>
        <div class="panel" style="margin-top:28px">
          <h3>Field selection</h3>
          <p class="muted">GET /api/v1/products/${p.id}?fields=title,price</p>
          <form id="fields-form" class="toolbar" style="grid-template-columns:1fr auto">
            <input name="fields" value="title,price" />
            <button class="btn btn-primary" type="submit">Fetch</button>
          </form>
          <pre class="output" id="fields-out"></pre>
        </div>
      </div>
    </div>
  `;
  const out = app.querySelector("#fields-out");
  async function runFields(raw) {
    const result = await api(`/api/v1/products/${id}?fields=${encodeURIComponent(raw)}`);
    out.textContent = JSON.stringify(result.body, null, 2);
  }
  runFields("title,price");
  app.querySelector("#fields-form").addEventListener("submit", (event) => {
    event.preventDefault();
    runFields(event.target.fields.value);
  });
}

async function renderDocs() {
  app.innerHTML = `
    <p class="eyebrow">API Lab</p>
    <h1>Talk to the resource.</h1>
    <p class="muted">Live requests against <code>/api/v1/products</code>. Same process, same error envelope.</p>
    <div class="form-grid" style="margin-top:28px">
      <div class="form-grid two">
        <label>Method
          <select id="method">
            <option>GET</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
          </select>
        </label>
        <label>Path
          <input id="path" value="/api/v1/products" />
        </label>
      </div>
      <label>JSON body
        <textarea id="body">{
  "title": "Wireless Headphones",
  "price": 4500,
  "description": "Bluetooth wireless headphones",
  "stock": 25,
  "category": "Electronics"
}</textarea>
      </label>
      <div class="row-actions">
        <button class="btn btn-primary" id="send">Send request</button>
        <button class="btn btn-ghost" id="fields-ex" type="button">Try ?fields=title,price</button>
      </div>
      <pre class="output" id="docs-out">Ready.</pre>
    </div>
  `;
  const send = async () => {
    const method = app.querySelector("#method").value;
    const path = app.querySelector("#path").value.trim();
    const raw = app.querySelector("#body").value;
    const options = { method };
    if (method === "POST" || method === "PUT") options.body = raw;
    const result = await api(path, options);
    app.querySelector("#docs-out").textContent = `${result.status}\n${JSON.stringify(result.body, null, 2)}`;
  };
  app.querySelector("#send").addEventListener("click", send);
  app.querySelector("#fields-ex").addEventListener("click", () => {
    app.querySelector("#method").value = "GET";
    app.querySelector("#path").value = "/api/v1/products/1?fields=title,price";
    send();
  });
}

async function renderStudio() {
  const list = await api("/api/v1/products?limit=8");
  const latest = (list.body || []).slice(0, 6);
  app.innerHTML = `
    <p class="eyebrow">Studio</p>
    <h1>Create, replace, delete.</h1>
    <p class="muted">Writes hit the Express API directly. PUT is a full replace and is idempotent.</p>
    <div class="detail" style="margin-top:28px">
      <form id="write-form" class="panel form-grid">
        <h3>Product payload</h3>
        <label>Title <input name="title" required value="Studio Test Lamp" /></label>
        <div class="form-grid two">
          <label>Price <input name="price" type="number" min="1" value="4500" required /></label>
          <label>Stock <input name="stock" type="number" min="0" value="12" required /></label>
        </div>
        <label>Category
          <select name="category">
            <option>Electronics</option>
            <option>Fashion</option>
            <option>Home & Living</option>
            <option>Beauty</option>
            <option>Sport & Outdoor</option>
          </select>
        </label>
        <label>Description <textarea name="description" required>A demonstration product created from the MEHVAR studio.</textarea></label>
        <label>Image URL <input name="image" value="https://images.unsplash.com/photo-1507473880760-e62ecd43edba?auto=format&fit=crop&w=1200&q=80" /></label>
        <label>Existing ID for PUT / DELETE <input name="id" placeholder="e.g. 61" /></label>
        <div class="row-actions">
          <button class="btn btn-primary" data-action="create" type="submit">POST create</button>
          <button class="btn btn-ghost" data-action="update" type="submit">PUT replace</button>
          <button class="btn btn-danger" data-action="delete" type="submit">DELETE</button>
        </div>
      </form>
      <div>
        <div class="panel">
          <h3>Response</h3>
          <pre class="output" id="studio-out">Create a product to see a 201 response.</pre>
        </div>
        <div class="section">
          <h3>Recent catalog</h3>
          ${productGrid(latest)}
        </div>
      </div>
    </div>
  `;
  const form = app.querySelector("#write-form");
  const out = app.querySelector("#studio-out");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const action = event.submitter?.dataset.action || "create";
    const data = Object.fromEntries(new FormData(form).entries());
    const payload = {
      title: data.title,
      price: Number(data.price),
      description: data.description,
      stock: Number(data.stock),
      category: data.category,
      image: data.image,
    };
    let result;
    if (action === "create") {
      result = await api("/api/v1/products", { method: "POST", body: JSON.stringify(payload) });
      if (result.status === 201) {
        form.id.value = result.body.id;
        toast(`Created product ${result.body.id}`);
      }
    } else if (action === "update") {
      result = await api(`/api/v1/products/${data.id}`, { method: "PUT", body: JSON.stringify(payload) });
      if (result.status === 200) toast("PUT replaced the product");
    } else {
      result = await api(`/api/v1/products/${data.id}`, { method: "DELETE" });
      if (result.status === 204) toast("Deleted");
    }
    out.textContent = `${result.status}\n${result.body ? JSON.stringify(result.body, null, 2) : ""}`;
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "\u0026amp;";
      case "<":
        return "\u0026lt;";
      case ">":
        return "\u0026gt;";
      case '"':
        return "\u0026quot;";
      default:
        return "\u0026#39;";
    }
  });
}

async function render() {
  setActiveNav();
  const path = location.pathname;
  try {
    if (path === "/" || path === "") return await renderHome();
    if (path === "/catalog") return await renderCatalog();
    if (path === "/docs") return await renderDocs();
    if (path === "/studio") return await renderStudio();
    const productMatch = path.match(/^\/product\/(\d+)$/);
    if (productMatch) return await renderProduct(productMatch[1]);
    app.innerHTML = `<div class="error-box"><h2>Not found</h2><p>No page at ${escapeHtml(path)}.</p></div>`;
  } catch (err) {
    app.innerHTML = `<div class="error-box"><h2>Could not load</h2><p>${escapeHtml(err.message)}</p></div>`;
  }
}

render();
