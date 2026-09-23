const request = require("supertest");
const app = require("../src/app");
const { resetProducts } = require("../src/services/productService");

const ERROR_KEYS = ["error_code", "message", "timestamp", "path"];

function assertErrorShape(res, status, errorCode) {
  expect(res.status).toBe(status);
  expect(Object.keys(res.body).sort()).toEqual([...ERROR_KEYS].sort());
  expect(res.body.error_code).toBe(errorCode);
  expect(typeof res.body.message).toBe("string");
  expect(res.body.message.length).toBeGreaterThan(0);
  expect(res.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(typeof res.body.path).toBe("string");
  expect(res.body.path.startsWith("/")).toBe(true);
  expect(JSON.stringify(res.body)).not.toMatch(/stack/i);
  expect(JSON.stringify(res.body)).not.toMatch(/password/i);
}

const sampleWrite = {
  title: "Wireless Headphones",
  price: 4500,
  description: "Bluetooth wireless headphones",
  stock: 25,
  category: "Electronics",
};

beforeEach(() => {
  resetProducts();
});

describe("MEHVAR product API", () => {
  test("GET /api/v1/products returns 200 and a JSON list", async () => {
    const res = await request(app).get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(50);
    expect(res.body[0]).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        title: expect.any(String),
        price: expect.any(Number),
        description: expect.any(String),
        stock: expect.any(Number),
        category: expect.any(String),
      }),
    );
  });

  test("every category contains at least 10 products", async () => {
    const res = await request(app).get("/api/v1/products");
    const counts = {};
    for (const product of res.body) {
      counts[product.category] = (counts[product.category] || 0) + 1;
    }
    expect(Object.keys(counts).length).toBeGreaterThanOrEqual(5);
    for (const [category, count] of Object.entries(counts)) {
      expect(count).toBeGreaterThanOrEqual(10);
    }
  });

  test("GET /api/v1/products/:id returns 200 for an existing product", async () => {
    const res = await request(app).get("/api/v1/products/1");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.title).toBe("Aurora Wireless Headphones");
    expect(res.body.price).toBe(4500);
  });

  test("GET missing product returns 404 with standardized error", async () => {
    const res = await request(app).get("/api/v1/products/99999");
    assertErrorShape(res, 404, "PRODUCT_NOT_FOUND");
    expect(res.body.path).toBe("/api/v1/products/99999");
    expect(res.body.message).toMatch(/99999/);
  });

  test("POST /api/v1/products returns 201 and the created product", async () => {
    const res = await request(app).post("/api/v1/products").send(sampleWrite);
    expect(res.status).toBe(201);
    expect(res.headers.location).toBe(`/api/v1/products/${res.body.id}`);
    expect(res.body.title).toBe(sampleWrite.title);
    expect(res.body.price).toBe(4500);
    expect(res.body.stock).toBe(25);
    expect(res.body.id).toBeGreaterThan(60);
    expect(res.body.sku).toMatch(/^MHV-/);
  });

  test("invalid POST returns 400, never 500", async () => {
    const missingTitle = await request(app).post("/api/v1/products").send({
      price: 10,
      description: "A product without a title",
      stock: 1,
      category: "Electronics",
    });
    assertErrorShape(missingTitle, 400, "VALIDATION_ERROR");

    const badPrice = await request(app).post("/api/v1/products").send({
      ...sampleWrite,
      price: 0,
    });
    assertErrorShape(badPrice, 400, "VALIDATION_ERROR");
    expect(badPrice.body.message).toMatch(/price/i);

    const negativeStock = await request(app).post("/api/v1/products").send({
      ...sampleWrite,
      stock: -3,
    });
    assertErrorShape(negativeStock, 400, "VALIDATION_ERROR");
    expect(negativeStock.body.message).toMatch(/stock/i);
  });

  test("POST duplicate SKU returns 409", async () => {
    const res = await request(app)
      .post("/api/v1/products")
      .send({ ...sampleWrite, sku: "MHV-ELC-001" });
    assertErrorShape(res, 409, "CONFLICT");
  });

  test("PUT /api/v1/products/:id returns 200", async () => {
    const payload = {
      title: "Wireless Headphones",
      price: 4500,
      description: "Bluetooth headphones",
      stock: 20,
      category: "Electronics",
      sku: "MHV-ELC-001",
      brand: "Lumen",
      image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=80",
    };
    const res = await request(app).put("/api/v1/products/1").send(payload);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe(payload.title);
    expect(res.body.stock).toBe(20);
    expect(res.body.id).toBe(1);
  });

  test("repeated identical PUT remains idempotent", async () => {
    const payload = {
      title: "Wireless Headphones",
      price: 4500,
      description: "Bluetooth headphones",
      stock: 20,
      category: "Electronics",
      sku: "MHV-ELC-001",
      brand: "Lumen",
      image: "https://example.com/headphones.jpg",
    };
    const first = await request(app).put("/api/v1/products/1").send(payload);
    const second = await request(app).put("/api/v1/products/1").send(payload);
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(second.body.sku).toBe("MHV-ELC-001");
  });

  test("DELETE /api/v1/products/:id returns 204", async () => {
    const res = await request(app).delete("/api/v1/products/1");
    expect(res.status).toBe(204);
    expect(res.body).toEqual({});
    const missing = await request(app).get("/api/v1/products/1");
    expect(missing.status).toBe(404);
  });

  test("DELETE missing product returns 404", async () => {
    const res = await request(app).delete("/api/v1/products/88888");
    assertErrorShape(res, 404, "PRODUCT_NOT_FOUND");
    expect(res.body.path).toBe("/api/v1/products/88888");
  });

  test("fields=title,price returns only selected fields", async () => {
    const res = await request(app).get("/api/v1/products/1?fields=title,price");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      title: "Aurora Wireless Headphones",
      price: 4500,
    });
  });

  test("invalid fields return 400 INVALID_FIELDS", async () => {
    const res = await request(app).get("/api/v1/products/1?fields=abc,xyz");
    assertErrorShape(res, 400, "INVALID_FIELDS");
    expect(res.body.message).toBe("Invalid fields: abc, xyz");
    expect(res.body.path).toBe("/api/v1/products/1");
  });

  test("pagination and filtering work", async () => {
    const page = await request(app).get("/api/v1/products?page=1&limit=10");
    expect(page.status).toBe(200);
    expect(page.body).toHaveLength(10);
    expect(page.headers["x-page"]).toBe("1");
    expect(page.headers["x-limit"]).toBe("10");
    expect(Number(page.headers["x-total-count"])).toBeGreaterThan(10);

    const electronics = await request(app).get("/api/v1/products?category=electronics");
    expect(electronics.status).toBe(200);
    expect(electronics.body.length).toBeGreaterThanOrEqual(10);
    expect(electronics.body.every((item) => item.category === "Electronics")).toBe(true);

    const search = await request(app).get("/api/v1/products?search=headphones");
    expect(search.status).toBe(200);
    expect(search.body.length).toBeGreaterThan(0);
    expect(search.body.some((item) => /headphone/i.test(item.title))).toBe(true);
  });

  test("standardized error format on unknown routes", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    assertErrorShape(res, 404, "ROUTE_NOT_FOUND");
  });

  test("unexpected errors become 500 without leaking internals", async () => {
    const res = await request(app).get("/api/v1/__test/error");
    assertErrorShape(res, 500, "INTERNAL_SERVER_ERROR");
    expect(res.body.message).toBe("An unexpected error occurred.");
  });

  test("GET /health returns ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
