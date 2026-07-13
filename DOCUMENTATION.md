# Kumar Dresses — Inventory Management System

A full-stack inventory management application for retail clothing stores with multi-store support, billing, stock tracking, and a customer-facing storefront.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router 6, Axios, Recharts, React Toastify |
| Backend | Node.js, Express 4, PostgreSQL (pg), JWT, Multer, Cloudinary |
| Database | PostgreSQL (Neon.tech) |
| Images | Cloudinary CDN |
| Frontend Hosting | Netlify |
| Backend Hosting | Render / Heroku |

---

## Features

1. **Multi-store inventory** — Track stock per variant per store
2. **Product variants** — Size/Color/Fit combinations with auto-generated SKU & barcode
3. **Hierarchical categories** — Parent/child category tree with size charts
4. **Stock transfers** — Move inventory between stores (pending → in_transit → completed)
5. **Stock reservations** — Hold inventory for customers with expiry dates
6. **Batch receiving** — Bulk stock intake with supplier tracking
7. **Billing / POS** — Create invoices, auto-deduct stock, partial payments
8. **Partial payment tracking** — Overdue alerts for unpaid balances
9. **Low-stock alerts** — Configurable reorder points per variant/store
10. **Dead stock & aging reports** — Identify slow-moving inventory
11. **Sales predictions** — Historical average forecasting
12. **Profit analytics** — Revenue vs cost breakdown (password-protected)
13. **Customer storefront** — Public product browsing, filtering, wishlist
14. **Role-based access** — Admin, Staff, User with route-level protection
15. **Cloudinary images** — Persistent, CDN-delivered product/logo images
16. **Audit trail** — Every stock change logged

---

## Project Structure

```
KumarDresses/
├── backend/
│   ├── server.js              # Express app entry point
│   ├── db.js                  # Database connection + schema initialization
│   ├── package.json
│   ├── Procfile               # Heroku deployment
│   ├── .env                   # Environment variables (not in git)
│   ├── middleware/
│   │   └── auth.js            # JWT verification + role authorization
│   ├── utils/
│   │   └── cloudinary.js      # Cloudinary upload/delete helpers
│   ├── routes/
│   │   ├── auth.js            # Login, profile, password change
│   │   ├── shop.js            # Shop configuration + logo
│   │   ├── categories.js      # Category CRUD
│   │   ├── sizeCharts.js      # Size chart management
│   │   ├── products.js        # Products + variants CRUD
│   │   ├── stores.js          # Store locations
│   │   ├── stock.js           # Stock overview, adjust, movements
│   │   ├── transfers.js       # Inter-store transfers
│   │   ├── reservations.js    # Customer stock holds
│   │   ├── batches.js         # Batch/lot receiving
│   │   ├── billing.js         # Bills + payments
│   │   ├── staff.js           # Staff management
│   │   ├── dashboard.js       # Analytics + profit data
│   │   ├── reports.js         # Dead stock, aging, valuation
│   │   └── storefront.js      # Public customer-facing API
│   └── uploads/               # Legacy local uploads (now using Cloudinary)
├── frontend/
│   ├── package.json
│   ├── .env.production        # Production API URL
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js             # Routes + layout
│   │   ├── App.css            # Global styles
│   │   ├── utils/
│   │   │   └── api.js         # Axios instance + image URL helper
│   │   ├── context/
│   │   │   └── AuthContext.js  # Auth state management
│   │   └── components/
│   │       ├── Layout.js           # Admin sidebar shell
│   │       ├── CustomerLayout.js   # Storefront shell
│   │       ├── Login.js
│   │       ├── Dashboard.js
│   │       ├── ProfitDashboard.js  # Password-protected profit view
│   │       ├── ShopConfig.js
│   │       ├── CategoryManagement.js
│   │       ├── SizeCharts.js
│   │       ├── ProductList.js
│   │       ├── ProductForm.js
│   │       ├── ProductDetail.js
│   │       ├── StoreManagement.js
│   │       ├── StockOverview.js
│   │       ├── StockAlerts.js
│   │       ├── StockTransfers.js
│   │       ├── StockReservations.js
│   │       ├── BatchManagement.js
│   │       ├── Billing.js
│   │       ├── BillHistory.js
│   │       ├── BillView.js
│   │       ├── PartialPayments.js
│   │       ├── StaffManagement.js
│   │       ├── DeadStockReport.js
│   │       ├── StockAgingReport.js
│   │       ├── Predictions.js
│   │       ├── CustomerHome.js
│   │       ├── CustomerProducts.js
│   │       ├── CustomerProductView.js
│   │       └── CustomerWishlist.js
│   └── build/                  # Production build output
└── netlify.toml                # Netlify deployment config
```

---

## Setup & Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database (or free [Neon.tech](https://neon.tech) account)
- [Cloudinary](https://cloudinary.com) free account (for image hosting)

### 1. Clone the repository
```bash
git clone <repo-url>
cd KumarDresses
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=your_secret_key_here
PORT=5000
FRONTEND_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

Start the backend:
```bash
npm run dev    # Development (with auto-reload)
npm start      # Production
```

> The database tables are auto-created on first startup.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start      # Development server on port 3000
```

For production build:
```bash
npm run build
```

### 4. Default Login
```
Username: admin
Password: admin123
```

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens |
| `PORT` | No | Server port (default: 5000) |
| `FRONTEND_URL` | Yes (prod) | Frontend URL for CORS (e.g., `https://yourapp.netlify.app`) |
| `CLOUDINARY_CLOUD_NAME` | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | Yes | From Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | Yes | From Cloudinary dashboard |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | Yes (prod) | Backend API URL (e.g., `https://yourbackend.onrender.com/api`) |

---

## Deployment

### Frontend → Netlify

1. Connect your Git repo to Netlify
2. Build settings (auto-detected from `netlify.toml`):
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/build`
3. Add environment variable:
   - `REACT_APP_API_URL` = `https://your-backend-url.com/api`

### Backend → Render

1. Create a new Web Service on Render
2. Root directory: `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL` (your Netlify URL)
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

---

## Database Schema

### Tables Overview

| Table | Description |
|-------|-------------|
| `users` | User accounts with roles (admin/staff/user) |
| `shop_config` | Shop branding — name, logo, address, GST |
| `stores` | Physical store locations |
| `categories` | Hierarchical product categories |
| `size_charts` | Size chart templates |
| `size_chart_entries` | Measurement rows for each chart |
| `products` | Master product catalog |
| `product_variants` | Size/color/fit variants per product |
| `variant_stock` | Stock quantity per variant per store |
| `stock_movements` | Audit log of all stock changes |
| `stock_transfers` | Inter-store transfer records |
| `stock_transfer_items` | Line items per transfer |
| `stock_reservations` | Customer holds on stock |
| `batches` | Purchase receiving lots |
| `batch_items` | Items received per batch |
| `bills` | Sales invoices |
| `bill_items` | Line items per bill |
| `payment_history` | Payment records for partial payments |
| `wishlists` | Customer product wishlists |

> All tables are auto-created when the backend starts for the first time.

---

## API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/login` | — | Login with username/password |
| GET | `/me` | Token | Get current user profile |
| PUT | `/change-password` | Token | Change password |

### Shop Config (`/api/shop`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | Get shop settings |
| PUT | `/` | Admin | Update shop (name, logo, GST, etc.) |

### Categories (`/api/categories`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List all categories (tree) |
| GET | `/:id` | Token | Get single category |
| POST | `/` | Admin | Create category |
| PUT | `/:id` | Admin | Update category |
| DELETE | `/:id` | Admin | Delete category |

### Products (`/api/products`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List products (paginated, filterable) |
| GET | `/:id` | Token | Get product with variants + stock |
| POST | `/` | Admin | Create product (with image) |
| PUT | `/:id` | Admin | Update product |
| DELETE | `/:id` | Admin | Soft-delete product |
| POST | `/:id/variants` | Admin | Add variant |
| POST | `/:id/variants/bulk` | Admin | Bulk add variants |
| PUT | `/:productId/variants/:variantId` | Admin | Update variant |
| DELETE | `/:productId/variants/:variantId` | Admin | Delete variant |

### Stores (`/api/stores`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List stores |
| GET | `/:id` | Token | Store detail with stock summary |
| POST | `/` | Admin | Create store |
| PUT | `/:id` | Admin | Update store |
| DELETE | `/:id` | Admin | Delete store |

### Stock (`/api/stock`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/overview` | Token | Stock levels (filterable) |
| GET | `/alerts` | Token | Low stock + out of stock |
| POST | `/adjust` | Staff+ | Adjust stock quantity |
| PUT | `/reorder-point` | Admin | Update reorder threshold |
| GET | `/movements` | Token | Movement audit log |

### Transfers (`/api/transfers`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List transfers |
| GET | `/:id` | Token | Transfer detail |
| POST | `/` | Staff+ | Create transfer |
| PUT | `/:id/status` | Staff+ | Update status (pending→in_transit→completed) |

### Reservations (`/api/reservations`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List reservations |
| POST | `/` | Staff+ | Create reservation |
| PUT | `/:id` | Staff+ | Fulfil/cancel reservation |

### Batches (`/api/batches`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | List batches |
| GET | `/:id` | Token | Batch detail |
| POST | `/` | Staff+ | Receive new batch |

### Billing (`/api/billing`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/partial/overdue` | Token | Overdue partial payments |
| GET | `/sold/report` | Token | Sold items report |
| GET | `/` | Token | List bills (paginated) |
| GET | `/:id` | Token | Bill detail with items + payments |
| POST | `/` | Staff+ | Create bill (deducts stock) |
| POST | `/:id/payment` | Staff+ | Add payment to partial bill |

### Dashboard (`/api/dashboard`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/` | Token | Main dashboard stats |
| GET | `/sales-chart` | Token | Monthly revenue chart |
| GET | `/predictions` | Token | Sales forecasting |
| GET | `/profit` | Token | Profit analytics |

### Reports (`/api/reports`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/dead-stock` | Token | Unsold items (configurable days) |
| GET | `/stock-aging` | Token | Inventory aging buckets |
| GET | `/inventory-value` | Token | Cost vs retail valuation |

### Public Storefront (`/api/storefront`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/config` | — | Shop name, tagline, logo |
| GET | `/categories` | — | Active categories |
| GET | `/products` | — | Browse products (paginated, filterable) |
| GET | `/products/:id` | — | Product detail + variants |
| GET | `/filters` | — | Available filter options |
| GET | `/new-arrivals` | — | Latest 12 products |
| GET | `/offers` | — | Top discounted products |
| GET | `/wishlist` | Token | User's wishlist |
| GET | `/wishlist/ids` | Token | User's wishlisted product IDs |
| POST | `/wishlist/:productId` | Token | Add to wishlist |
| DELETE | `/wishlist/:productId` | Token | Remove from wishlist |

---

## User Roles

| Role | Access |
|------|--------|
| `admin` | Full access — all CRUD, settings, staff management |
| `staff` | Billing, stock adjustments, transfers, reservations, batches |
| `user` | View-only access to products, stock, bills |

---

## Frontend Pages

### Admin Panel (requires login)
| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/dashboard` | KPIs, charts, recent activity |
| Products | `/products` | Product catalog |
| Categories | `/categories` | Category management (admin) |
| Size Charts | `/size-charts` | Size chart templates (admin) |
| Stock Overview | `/stock` | Inventory levels |
| Stock Alerts | `/stock/alerts` | Low stock warnings |
| Transfers | `/stock/transfers` | Inter-store transfers |
| Reservations | `/stock/reservations` | Customer holds |
| Batches | `/stock/batches` | Receive stock |
| New Bill | `/billing` | Create sales invoice |
| Bill History | `/bills` | Past invoices |
| Partial Payments | `/partial-payments` | Outstanding balances |
| Profit Dashboard | `/profit` | Profit analysis (password: `Kumar@profit2024`) |
| Dead Stock | `/reports/dead-stock` | Unsold inventory |
| Stock Aging | `/reports/stock-aging` | Inventory age analysis |
| Predictions | `/reports/predictions` | Sales forecasting |
| Stores | `/stores` | Store locations (admin) |
| Staff | `/staff` | Staff members (admin) |
| Shop Config | `/shop-config` | Shop settings (admin) |

### Customer Storefront (public)
| Page | Path | Description |
|------|------|-------------|
| Home | `/shop` | Hero, new arrivals, offers, categories |
| Products | `/shop/products` | Browse with filters |
| Product Detail | `/shop/products/:id` | Full product view |
| Wishlist | `/shop/wishlist` | Saved products (login required) |

---

## Workflow Examples

### Adding a Product
1. Go to **Products → Add Product**
2. Fill name, category, brand, MRP, selling price, cost price
3. Upload image → goes to Cloudinary
4. Save → auto-generates SKU + barcode
5. Add variants (sizes/colors) → auto-creates stock entries in all stores

### Creating a Bill
1. Go to **New Bill**
2. Select store, search products, add items
3. Apply discount if needed
4. Choose payment method, enter paid amount
5. Save → stock auto-deducted, movement recorded
6. If partial payment → tracked in Partial Payments section

### Stock Transfer
1. Go to **Transfers → New Transfer**
2. Select from-store, to-store
3. Add items + quantities
4. Create (status: pending)
5. Mark as "In Transit" when shipped
6. Mark as "Completed" → stock moves between stores

---

## Security Notes

- Passwords hashed with bcrypt (10 rounds)
- JWT tokens expire in 24 hours
- Role-based route protection on both frontend and backend
- CORS restricted to configured frontend URL
- File uploads limited to 5MB
- SQL injection prevented via parameterized queries
- Profit dashboard has additional password gate

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Images not loading | Check Cloudinary env vars are set on hosting |
| Shop page empty | Verify products have `active = 1` in database |
| 401 errors | Token expired — re-login |
| CORS errors | Set `FRONTEND_URL` env var on backend |
| Database connection failed | Check `DATABASE_URL` and SSL settings |
| Build fails | Run `npm install` in both `backend/` and `frontend/` |
