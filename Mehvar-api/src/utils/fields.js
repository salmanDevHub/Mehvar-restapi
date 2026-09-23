const { ApiError } = require("./errors");

const ALLOWED_FIELDS = Object.freeze([
  "id",
  "title",
  "price",
  "description",
  "stock",
  "category",
  "sku",
  "brand",
  "image",
  "created_at",
  "updated_at",
]);

function parseFields(raw) {
  if (raw == null) return null;

  const trimmed = String(raw).trim();
  if (!trimmed) {
    throw new ApiError(
      400,
      "INVALID_FIELDS",
      "The fields parameter cannot be empty. Pass a comma-separated list such as title,price.",
    );
  }

  const requested = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new ApiError(
      400,
      "INVALID_FIELDS",
      "The fields parameter cannot be empty. Pass a comma-separated list such as title,price.",
    );
  }

  const allowed = new Set(ALLOWED_FIELDS);
  const invalid = requested.filter((field) => !allowed.has(field));
  if (invalid.length > 0) {
    throw new ApiError(400, "INVALID_FIELDS", `Invalid fields: ${invalid.join(", ")}`);
  }

  return requested;
}

function projectProduct(product, fields) {
  if (!fields) return { ...product };
  const selected = {};
  for (const field of fields) {
    selected[field] = product[field];
  }
  return selected;
}

module.exports = {
  ALLOWED_FIELDS,
  parseFields,
  projectProduct,
};
