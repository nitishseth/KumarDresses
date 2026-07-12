import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import CustomerLayout from './components/CustomerLayout';
import CustomerHome from './components/CustomerHome';
import CustomerProducts from './components/CustomerProducts';
import CustomerProductView from './components/CustomerProductView';
import CustomerWishlist from './components/CustomerWishlist';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ShopConfig from './components/ShopConfig';
import CategoryManagement from './components/CategoryManagement';
import SizeCharts from './components/SizeCharts';
import ProductList from './components/ProductList';
import ProductForm from './components/ProductForm';
import ProductDetail from './components/ProductDetail';
import StoreManagement from './components/StoreManagement';
import StockOverview from './components/StockOverview';
import StockAlerts from './components/StockAlerts';
import StockTransfers from './components/StockTransfers';
import StockReservations from './components/StockReservations';
import BatchManagement from './components/BatchManagement';
import Billing from './components/Billing';
import BillHistory from './components/BillHistory';
import BillView from './components/BillView';
import PartialPayments from './components/PartialPayments';
import StaffManagement from './components/StaffManagement';
import DeadStockReport from './components/DeadStockReport';
import StockAgingReport from './components/StockAgingReport';
import Predictions from './components/Predictions';
import About from './components/About';
import './App.css';
import './components/CustomerStorefront.css';

function PrivateRoute({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Customer-facing storefront — accessible without login */}
      <Route path="/shop" element={<CustomerLayout />}>
        <Route index element={<CustomerHome />} />
        <Route path="products" element={<CustomerProducts />} />
        <Route path="products/:id" element={<CustomerProductView />} />
        <Route path="wishlist" element={<CustomerWishlist />} />
      </Route>

      {/* Login page */}
      {!user && <Route path="/login" element={<Login />} />}

      {/* Admin / staff panel — requires login */}
      {!user ? (
        <Route path="*" element={<Login />} />
      ) : (
        <Route element={<Layout><Outlet /></Layout>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/shop-config" element={<PrivateRoute adminOnly><ShopConfig /></PrivateRoute>} />
          <Route path="/categories" element={<PrivateRoute adminOnly><CategoryManagement /></PrivateRoute>} />
          <Route path="/size-charts" element={<PrivateRoute adminOnly><SizeCharts /></PrivateRoute>} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<PrivateRoute adminOnly><ProductForm /></PrivateRoute>} />
          <Route path="/products/edit/:id" element={<PrivateRoute adminOnly><ProductForm /></PrivateRoute>} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/stores" element={<PrivateRoute adminOnly><StoreManagement /></PrivateRoute>} />
          <Route path="/stock" element={<StockOverview />} />
          <Route path="/stock/alerts" element={<StockAlerts />} />
          <Route path="/stock/transfers" element={<StockTransfers />} />
          <Route path="/stock/reservations" element={<StockReservations />} />
          <Route path="/stock/batches" element={<BatchManagement />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/bills" element={<BillHistory />} />
          <Route path="/bills/:id" element={<BillView />} />
          <Route path="/partial-payments" element={<PartialPayments />} />
          <Route path="/staff" element={<PrivateRoute adminOnly><StaffManagement /></PrivateRoute>} />
          <Route path="/reports/dead-stock" element={<DeadStockReport />} />
          <Route path="/reports/stock-aging" element={<StockAgingReport />} />
          <Route path="/reports/predictions" element={<Predictions />} />
          <Route path="/about" element={<About />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </AuthProvider>
    </BrowserRouter>
  );
}
