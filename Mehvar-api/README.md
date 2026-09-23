# MEHVAR

Modern E-Commerce REST API

MEHVAR is a local Node.js / Express catalog that treats products as a REST resource. It uses noun-based URLs, honest HTTP status codes, an idempotent PUT, a single JSON error envelope, and `?fields=` so clients do not over-fetch.

## Assignment Objective

Build a local Node.js / Express API for an e-commerce system that strictly adheres to:

- RESTful API principles
- Correct HTTP verbs
- Idempotent operations
- Standardized JSON error responses
- Field selection (`?fields=title,price`) to solve REST over-fetching

This repository is the working implementation of that brief.

## Features

- RESTful product API under `/api/v1`
- API versioning
- Full product CRUD
- Correct HTTP verbs (`GET`, `POST`, `PUT`, `DELETE`)
- Idempotent `PUT /api/v1/products/:id`
- Standardized error envelope (`error_code`, `message`, `timestamp`, `path`)
- Field selection to prevent over-fetching
- Pagination (`page`, `limit`)
- Filtering (`category`, `search`)
- In-memory catalog with 60 products (12 in each of 5 categories)
- Storefront + API lab served by the same Express process
- Automated Jest + Supertest suite

## Tech Stack

- Node.js
- Express.js
- JavaScript (CommonJS)
- JSON
- Jest + Supertest
- In-memory product repository (no external database required)

The catalog lives in [`src/data/products.js`](src/data/products.js). Data resets when the process restarts, which keeps `npm start` and `npm test` reliable on any machine.

## Installation

```bash
git clone https://github.com/<your-username>/MEHVAR.git
cd MEHVAR
npm install
```

## Environment Setup

Copy the example environment file and adjust if needed:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | Bind address |

Do not commit `.env`. There are no database passwords or API keys in this project.

## Run

```bash
npm start
```

The API listens on `http://localhost:3000` by default.

Open the storefront at `/` or call `GET /health` to confirm the process is up.

## Development

```bash
npm run dev
```

Uses nodemon so the server reloads on file changes.

## Testing

```bash
npm test
```

The suite covers:

1. `GET /api/v1/products` → 200
2. `GET /api/v1/products/:id` → 200
3. Missing product → 404
4. `POST /api/v1/products` → 201
5. Invalid `POST` → 400
6. `PUT /api/v1/products/:id` → 200
7. Repeated identical `PUT` stays idempotent
8. `DELETE /api/v1/products/:id` → 204
9. `DELETE` missing product → 404
10. `fields=title,price` returns only those keys
11. Invalid fields → 400
12. Standardized error format, pagination, filtering, and 500 handling

## API Endpoints

Base path: `/api/v1`

| Method | Path | Success | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/products` | 200 | JSON array. Optional `page`, `limit`, `category`, `search`, `fields` |
| `GET` | `/api/v1/products/:id` | 200 | Single product. Optional `fields` |
| `POST` | `/api/v1/products` | 201 | Create. `Location` header set |
| `PUT` | `/api/v1/products/:id` | 200 | Full replace. Idempotent |
| `DELETE` | `/api/v1/products/:id` | 204 | Empty body |
| `GET` | `/api/v1/categories` | 200 | Category list with counts |
| `GET` | `/health` | 200 | `{ "status": "ok" }` |

### Product model

```json
{
  "id": 1,
  "title": "Aurora Wireless Headphones",
  "price": 4500,
  "description": "Bluetooth wireless headphones",
  "stock": 42,
  "category": "Electronics",
  "sku": "MHV-ELC-001",
  "brand": "Lumen",
  "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
  "created_at": "2026-01-15T08:00:00.000Z",
  "updated_at": "2026-01-15T08:00:00.000Z"
}
```

Required write fields: `title`, `price` (> 0), `description`, `stock` (>= 0), `category`.

Optional write fields: `sku`, `brand`, `image`.

## Examples

### GET all products

```bash
curl http://localhost:3000/api/v1/products
```

### GET with pagination and filter

```bash
curl "http://localhost:3000/api/v1/products?page=1&limit=10&category=electronics"
curl "http://localhost:3000/api/v1/products?search=headphones"
```

Pagination metadata is also returned as headers:

- `X-Total-Count`
- `X-Page`
- `X-Limit`
- `X-Total-Pages`

### GET a single product

```bash
curl http://localhost:3000/api/v1/products/1
```

### Field selection

```bash
curl "http://localhost:3000/api/v1/products/1?fields=title,price"
```

Response:

```json
{
  "title": "Aurora Wireless Headphones",
  "price": 4500
}
```

### POST a product

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Wireless Headphones",
    "price": 4500,
    "description": "Bluetooth wireless headphones",
    "stock": 25,
    "category": "Electronics"
  }'
```

Returns **201 Created** and the new product.

### PUT a product (idempotent)

```bash
curl -X PUT http://localhost:3000/api/v1/products/1 \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Wireless Headphones",
    "price": 4500,
    "description": "Bluetooth headphones",
    "stock": 20,
    "category": "Electronics"
  }'
```

Sending this request twice leaves the resource in the same final state.

### DELETE a product

```bash
curl -X DELETE http://localhost:3000/api/v1/products/1
```

Returns **204 No Content**. A second delete returns **404**.

## Error Response

Every API error uses one structure:

```json
{
  "error_code": "PRODUCT_NOT_FOUND",
  "message": "Product with ID 123 was not found.",
  "timestamp": "2026-09-23T00:00:00.000Z",
  "path": "/api/v1/products/123"
}
```

Required fields: `error_code`, `message`, `timestamp`, `path`.

| Status | When |
| --- | --- |
| 400 | Validation failure, invalid id, invalid fields, invalid pagination |
| 404 | Product or route not found |
| 409 | Duplicate SKU |
| 500 | Unexpected server error (safe message, no stack traces) |

Invalid example:

```bash
curl "http://localhost:3000/api/v1/products/1?fields=abc,xyz"
```

```json
{
  "error_code": "INVALID_FIELDS",
  "message": "Invalid fields: abc, xyz",
  "timestamp": "2026-09-23T00:00:00.000Z",
  "path": "/api/v1/products/1"
}
```

## Idempotency

`PUT /api/v1/products/:id` is idempotent.

- It replaces the complete resource with the request body.
- The product `id` never changes.
- SKU is taken from the body, or the existing SKU is kept. The server does **not** generate a new random SKU on each PUT.
- `updated_at` only changes when the resource values actually change.
- Repeating the exact same PUT therefore yields the same JSON document.

`DELETE` of an already-deleted product is **not** treated as success: a missing id returns 404, which is the assignment contract.

## Over-fetching

REST responses often include every field on a product even when a mobile tile only needs `title` and `price`. MEHVAR solves that without GraphQL:

```
GET /api/v1/products/1?fields=title,price
```

The server:

1. Parses the comma-separated list
2. Rejects unknown names with `400 INVALID_FIELDS`
3. Returns **only** the requested keys

Allowed fields: `id`, `title`, `price`, `description`, `stock`, `category`, `sku`, `brand`, `image`, `created_at`, `updated_at`.

## Project Structure

```text
MEHVAR/
├── src/
│   ├── server.js
│   ├── app.js
│   ├── routes/
│   │   └── productRoutes.js
│   ├── controllers/
│   │   └── productController.js
│   ├── services/
│   │   └── productService.js
│   ├── middleware/
│   │   ├── errorHandler.js
│   │   └── notFound.js
│   ├── utils/
│   │   ├── errors.js
│   │   └── fields.js
│   └── data/
│       └── products.js
├── public/                 # storefront + API lab
├── tests/
│   └── products.test.js
├── package.json
├── README.md
├── .gitignore
└── .env.example
```

## Storefront

The same Express process serves a small catalog UI:

- `/` home
- `/catalog` filterable product grid
- `/product/:id` product detail + live `?fields=` demo
- `/docs` API lab
- `/studio` create / replace / delete against the live API

## License

University / portfolio project. Catalog photography via Unsplash.
