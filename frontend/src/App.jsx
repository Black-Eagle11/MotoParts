import { Link, Navigate, Route, Routes } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

// Halaman pelanggan
import StorePage from "./pages/StorePage";
import ProductDetailPage from "./pages/ProductDetailPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import MyOrdersPage from "./pages/MyOrdersPage";

// Halaman admin
import AdminDashboard from "./pages/admin/AdminDashboard";
import ProductForm from "./pages/admin/ProductForm";
import OrdersPage from "./pages/admin/OrdersPage";

function NotFoundPage() {
  return (
    <main className="page-container">
      <section className="empty-state">
        <p className="eyebrow">404 — PAGE NOT FOUND</p>

        <h1>Halaman tidak ditemukan</h1>

        <p>
          Maaf, halaman yang kamu cari tidak tersedia
          atau alamatnya sudah berubah.
        </p>

        <Link to="/" className="button button-primary">
          Kembali ke Beranda
        </Link>
      </section>
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />

      <div className="app-main">
        <Routes>

          <Route
            path="/"
            element={<StorePage />}
          />

          <Route
            path="/product/:id"
            element={<ProductDetailPage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/register"
            element={<RegisterPage />}
          />

          <Route
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />

          {/* Alamat utama setelah checkout berhasil */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <MyOrdersPage />
              </ProtectedRoute>
            }
          />

          {/* Alias agar link lama tetap berfungsi */}
          <Route
            path="/my-orders"
            element={<Navigate to="/orders" replace />}
          />

          {/* =========================
              ADMIN
          ========================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/products/new"
            element={
              <ProtectedRoute requireAdmin>
                <ProductForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/products/:id/edit"
            element={
              <ProtectedRoute requireAdmin>
                <ProductForm />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute requireAdmin>
                <OrdersPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<NotFoundPage />}
          />
        </Routes>
      </div>
    </div>
  );
}
