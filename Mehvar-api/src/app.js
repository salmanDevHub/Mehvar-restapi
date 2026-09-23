const path = require("path");
const express = require("express");
const cors = require("cors");
const productRoutes = require("./routes/productRoutes");
const productController = require("./controllers/productController");
const errorHandler = require("./middleware/errorHandler");
const notFound = require("./middleware/notFound");

const app = express();
const publicDir = path.join(__dirname, "..", "public");

app.disable("x-powered-by");
app.use(
  cors({
    exposedHeaders: ["X-Total-Count", "X-Page", "X-Limit", "X-Total-Pages", "Location"],
  }),
);
app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
  });
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/api/v1/categories", productController.listCategories);
app.use("/api/v1/products", productRoutes);

if (process.env.NODE_ENV === "test") {
  app.get("/api/v1/__test/error", (req, res, next) => {
    next(new Error("forced failure"));
  });
}

app.use(express.static(publicDir));

const spaRoutes = ["/", "/catalog", "/docs", "/studio"];
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});
app.get("/product/:id", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.use(notFound);
app.use(errorHandler);

module.exports = app;
