# 👔 Kumar Dresses — Inventory Management System

A complete, full-stack inventory management system built specifically for **readymade garment shops**. Manage products, track stock across multiple stores, generate barcode-enabled bills, monitor payments, and gain insights through smart analytics — all in one platform.

**Live Demo:** [kumardresses.netlify.app](https://kumardresses.netlify.app)

---

## 📸 Screenshots

| Login | Dashboard | Products |
|-------|-----------|----------|
| Split-panel login with branding | Revenue charts, top sellers, alerts | Product grid with SKU, barcode, stock |

| Billing (POS) | Stock Overview | User Management |
|---------------|----------------|-----------------|
| Cart-based billing with live search | Real-time stock per store per variant | Card-based user grid with role badges |

---

## ✨ Features

### 🛍️ Product Management
- Create products with unique **SKU** and **barcode** (auto-generated)
- **Multi-level categories**: Men / Women / Kids → Shirts / Trousers → sub-style
- **Variant management**: each Size + Color + Fit combination tracked separately
- Product attributes: brand, fabric, material, season, collection, MRP, cost price, HSN code, tax %
- Product photo upload
- **Barcode / label printing** for each SKU-variant (Code128 format)
- **Size chart** reference linked to each product category

### 📦 Inventory & Stock
- Real-time stock levels per size / color / store
- **Multi-location / multi-store** inventory tracking
- **Stock transfers** between stores/warehouse (pending → in-transit → completed)
- **Low-stock & out-of-stock alerts** with configurable reorder point per SKU
- **Stock reservations** for online orders / holds / layaway
- **Dead stock / slow-moving stock** identification
- **Stock aging report** (by season, by days in inventory)
- **Batch/lot tracking** for manufactured or received batches
- Full stock movement **audit trail**

### 🧾 Billing & Sales
- Cart-based **POS billing** with live product search
- Auto stock deduction on bill creation
- **Barcode on every bill** (scannable, printable)
- **Partial payment tracking** with payment history
- **Overdue payment alerts** (>30 days notification)
- Sold items report filtered by date range
- Printable bill receipts with shop branding

### 📊 Dashboard & Reports
- Today's / this month's sales, revenue, bill count
- Revenue charts (daily line chart + monthly bar chart)
- Top selling products
- Recent bills at a glance
- **Sales predictions** — predicts which items will sell more in a given month based on historical data
- **Stock aging report** — 0-30d / 31-60d / 61-90d / 91-180d / 180d+ buckets
- **Dead stock report** — items with no sales in N days
- **Inventory valuation** by store

### 👥 User Management & Access Control
- **3 roles**: Admin, Staff, Viewer
- **Admin**: Full access — products, staff, stores, billing, settings, reports
- **Staff**: Billing, stock adjustments, transfers
- **Viewer**: View-only — products, dashboard, reports
- Staff photo upload, store assignment
- User profile with view/edit/deactivate actions

### ⚙️ Shop Configuration
- One-time shop setup: name, tagline, address, phone, email, GST number
- Custom logo upload (default logo provided)
- Logo appears on sidebar, login page, and bill receipts

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, React Router v6, Recharts, react-barcode, react-toastify, react-icons |
| **Backend** | Node.js, Express.js |
| **Database** | SQLite (better-sqlite3) |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs |
| **File Upload** | Multer |
| **Barcode** | react-barcode (Code128) |

---

## 📁 Project Structure

```
KumarDresses/
├── backend/
│   ├── server.js              # Express server entry point
│   ├── db.js                  # SQLite database setup & schema (18 tables)
│   ├── middleware/
│   │   └── auth.js            # JWT authentication & role authorization
│   ├── routes/
│   │   ├── auth.js            # Login, current user, change password
│   │   ├── shop.js            # Shop configuration CRUD
│   │   ├── categories.js      # Hierarchical category management
│   │   ├── sizeCharts.js      # Size chart CRUD with entries
│   │   ├── products.js        # Products + variants CRUD
│   │   ├── stores.js          # Multi-store management
│   │   ├── stock.js           # Stock overview, adjustments, alerts
│   │   ├── transfers.js       # Stock transfers between stores
│   │   ├── reservations.js    # Stock reservations
│   │   ├── batches.js         # Batch/lot receiving
│   │   ├── staff.js           # User/staff CRUD
│   │   ├── billing.js         # Bill creation, payments, sold reports
│   │   ├── dashboard.js       # Dashboard stats, charts, predictions
│   │   └── reports.js         # Dead stock, aging, valuation reports
│   ├── uploads/               # Uploaded images (products, staff, logo)
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── logo.svg           # Default shop logo
│   ├── src/
│   │   ├── App.js             # Routes & layout
│   │   ├── App.css            # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.js  # Auth state management
│   │   ├── utils/
│   │   │   └── api.js          # Axios instance with JWT interceptor
│   │   └── components/         # 25 React components
│   ├── .env.production         # Production API URL
│   └── package.json
├── netlify.toml                # Netlify deployment config
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **npm** v9+

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/your-username/KumarDresses.git
cd KumarDresses

# 2. Install & start backend (port 5000)
cd backend
npm install
node server.js

# 3. In a new terminal — install & start frontend (port 3000)
cd frontend
npm install
npm start
```

Open **http://localhost:3000** in your browser.

### Default Admin Login
| Username | Password |
|----------|----------|
| `admin` | `admin123` |

---

## 🌐 Deployment

### Frontend → Netlify (Free)
1. Push repo to GitHub
2. Netlify → **Add new site → Import from Git**
3. `netlify.toml` auto-configures the build
4. Set environment variable: `REACT_APP_API_URL` = `https://your-backend.onrender.com/api`

### Backend → Render.com
1. Render → **New Web Service** → connect GitHub repo
2. **Root Directory**: `backend`
3. **Build Command**: `npm install`
4. **Start Command**: `node server.js`
5. Environment variables:

| Key | Value |
|-----|-------|
| `FRONTEND_URL` | `https://kumardresses.netlify.app` |
| `JWT_SECRET` | Any secure random string |
| `DB_PATH` | `/data/kumar_dresses.db` |

6. Add a **Disk** at `/data` for persistent database storage

---

## 🗄️ Database Schema

18 SQLite tables, auto-created on first run:

| Area | Tables |
|------|--------|
| Users & Auth | `users`, `shop_config` |
| Stores | `stores` |
| Products | `categories`, `size_charts`, `size_chart_entries`, `products`, `product_variants` |
| Stock | `variant_stock`, `stock_movements`, `stock_transfers`, `stock_transfer_items`, `stock_reservations` |
| Batches | `batches`, `batch_items` |
| Billing | `bills`, `bill_items`, `payment_history` |

---

## 👨‍💻 Developer

**Nitish Kumar** — Software Engineer

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0A66C2?logo=linkedin)](https://in.linkedin.com/in/nitish-kumar-b8a206104)

---

## 📄 License

© 2026 Kumar Dresses. All rights reserved.

Unauthorized reproduction or distribution of this software is prohibited.
