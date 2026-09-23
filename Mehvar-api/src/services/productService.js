const { seedProducts, CATEGORIES } = require("../data/products");
const { ApiError } = require("../utils/errors");
const { parseFields, projectProduct } = require("../utils/fields");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function categorySlug(name) {
  return String(name)
    .toLowerCase()
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

let products = [];
let nextId = 1;

function resetProducts() {
  products = clone(seedProducts);
  nextId = products.reduce((max, item) => Math.max(max, item.id), 0) + 1;
}

resetProducts();

function findById(id) {
  return products.find((item) => item.id === id) || null;
}

function parsePositiveInt(value, label) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new ApiError(400, "VALIDATION_ERROR", `${label} must be a positive integer.`);
  }
  return parsed;
}

function sameResource(left, right) {
  const keys = ["title", "price", "description", "stock", "category", "sku", "brand", "image"];
  return keys.every((key) => left[key] === right[key]);
}

function validatePayload(body) {
  if (body == null || typeof body !== "object" || Array.isArray(body)) {
    throw new ApiError(400, "VALIDATION_ERROR", "Request body must be a JSON object.");
  }

  if (typeof body.title !== "string" || body.title.trim() === "") {
    throw new ApiError(400, "VALIDATION_ERROR", "Title is required.");
  }
  const title = body.title.trim();
  if (title.length > 160) {
    throw new ApiError(400, "VALIDATION_ERROR", "Title must be 160 characters or fewer.");
  }

  const price = Number(body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Price must be greater than 0.");
  }

  if (body.description == null || String(body.description).trim() === "") {
    throw new ApiError(400, "VALIDATION_ERROR", "Description is required.");
  }
  const description = String(body.description).trim();

  const stock = Number(body.stock);
  if (!Number.isInteger(stock) || stock < 0) {
    throw new ApiError(400, "VALIDATION_ERROR", "Stock cannot be negative and must be an integer.");
  }

  if (body.category == null || String(body.category).trim() === "") {
    throw new ApiError(400, "VALIDATION_ERROR", "Category is required.");
  }
  const category = String(body.category).trim();

  let sku = null;
  if (body.sku != null && String(body.sku).trim() !== "") {
    sku = String(body.sku).trim().toUpperCase();
    if (sku.length > 40) {
      throw new ApiError(400, "VALIDATION_ERROR", "SKU must be 40 characters or fewer.");
    }
  }

  const brand = body.brand == null ? "" : String(body.brand).trim();
  const image = body.image == null ? "" : String(body.image).trim();

  return { title, price, description, stock, category, sku, brand, image };
}

function matchesCategory(product, categoryQuery) {
  if (!categoryQuery) return true;
  const needle = categoryQuery.trim().toLowerCase();
  if (!needle) return true;
  const name = product.category.toLowerCase();
  const slug = categorySlug(product.category);
  return name === needle || slug === needle || slug.includes(needle) || name.includes(needle);
}

function matchesSearch(product, searchQuery) {
  if (!searchQuery) return true;
  const needle = searchQuery.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [product.title, product.description, product.brand, product.category, product.sku]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function parsePagination(query) {
  const pageRaw = query.page;
  const limitRaw = query.limit;
  const hasPagination = pageRaw != null || limitRaw != null;

  const page = pageRaw == null || pageRaw === "" ? 1 : Number(pageRaw);
  const defaultLimit = hasPagination ? 10 : products.length || 10;
  const limit = limitRaw == null || limitRaw === "" ? defaultLimit : Number(limitRaw);

  if (!Number.isInteger(page) || page < 1) {
    throw new ApiError(400, "INVALID_PAGINATION", "Query parameter page must be a positive integer.");
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new ApiError(400, "INVALID_PAGINATION", "Query parameter limit must be a positive integer.");
  }
  if (limit > 100) {
    throw new ApiError(400, "INVALID_PAGINATION", "Query parameter limit cannot exceed 100.");
  }

  return { page, limit, offset: (page - 1) * limit };
}

function listProducts(query = {}) {
  const fields = parseFields(query.fields);
  const category = query.category == null ? "" : String(query.category);
  const search = query.search == null ? "" : String(query.search);
  const { page, limit, offset } = parsePagination(query);

  const filtered = products.filter(
    (item) => matchesCategory(item, category) && matchesSearch(item, search),
  );

  const total = filtered.length;
  const pageItems = filtered.slice(offset, offset + limit).map((item) => projectProduct(item, fields));

  return {
    data: pageItems,
    pagination: {
      page,
      limit,
      total,
      total_pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

function getProduct(idValue, fieldsRaw) {
  const id = parsePositiveInt(idValue, "Product ID");
  const fields = parseFields(fieldsRaw);
  const product = findById(id);
  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", `Product with ID ${id} was not found.`);
  }
  return projectProduct(product, fields);
}

function createProduct(body) {
  const data = validatePayload(body);
  if (data.sku && products.some((item) => item.sku === data.sku)) {
    throw new ApiError(409, "CONFLICT", `A product with SKU ${data.sku} already exists.`);
  }

  const now = new Date().toISOString();
  const id = nextId;
  nextId += 1;
  const sku = data.sku || `MHV-${String(id).padStart(4, "0")}`;

  if (products.some((item) => item.sku === sku)) {
    throw new ApiError(409, "CONFLICT", `A product with SKU ${sku} already exists.`);
  }

  const product = {
    id,
    title: data.title,
    price: data.price,
    description: data.description,
    stock: data.stock,
    category: data.category,
    sku,
    brand: data.brand,
    image: data.image,
    created_at: now,
    updated_at: now,
  };
  products.push(product);
  return clone(product);
}

function updateProduct(idValue, body) {
  const id = parsePositiveInt(idValue, "Product ID");
  const existing = findById(id);
  if (!existing) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", `Product with ID ${id} was not found.`);
  }

  const data = validatePayload(body);
  const sku = data.sku || existing.sku;
  const conflict = products.find((item) => item.sku === sku && item.id !== id);
  if (conflict) {
    throw new ApiError(409, "CONFLICT", `A product with SKU ${sku} already exists.`);
  }

  const next = {
    ...existing,
    title: data.title,
    price: data.price,
    description: data.description,
    stock: data.stock,
    category: data.category,
    sku,
    brand: data.brand,
    image: data.image,
    id: existing.id,
    created_at: existing.created_at,
  };

  if (!sameResource(existing, next)) {
    next.updated_at = new Date().toISOString();
  }

  const index = products.findIndex((item) => item.id === id);
  products[index] = next;
  return clone(next);
}

function deleteProduct(idValue) {
  const id = parsePositiveInt(idValue, "Product ID");
  const index = products.findIndex((item) => item.id === id);
  if (index === -1) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", `Product with ID ${id} was not found.`);
  }
  products.splice(index, 1);
}

function listCategories() {
  const counts = new Map();
  for (const product of products) {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
  }

  return CATEGORIES.map((category) => ({
    slug: category.slug,
    name: category.name,
    description: category.description,
    image: category.image,
    count: counts.get(category.name) || 0,
  }));
}

module.exports = {
  resetProducts,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
  categorySlug,
};
