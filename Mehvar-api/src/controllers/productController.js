const productService = require("../services/productService");

function listProducts(req, res, next) {
  try {
    const result = productService.listProducts(req.query);
    res.set("X-Total-Count", String(result.pagination.total));
    res.set("X-Page", String(result.pagination.page));
    res.set("X-Limit", String(result.pagination.limit));
    res.set("X-Total-Pages", String(result.pagination.total_pages));
    res.status(200).json(result.data);
  } catch (err) {
    next(err);
  }
}

function getProduct(req, res, next) {
  try {
    const product = productService.getProduct(req.params.id, req.query.fields);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

function createProduct(req, res, next) {
  try {
    const product = productService.createProduct(req.body);
    res.status(201).location(`/api/v1/products/${product.id}`).json(product);
  } catch (err) {
    next(err);
  }
}

function updateProduct(req, res, next) {
  try {
    const product = productService.updateProduct(req.params.id, req.body);
    res.status(200).json(product);
  } catch (err) {
    next(err);
  }
}

function deleteProduct(req, res, next) {
  try {
    productService.deleteProduct(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

function listCategories(req, res, next) {
  try {
    res.status(200).json(productService.listCategories());
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  listCategories,
};
