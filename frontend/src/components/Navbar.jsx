import { Link, NavLink, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

export default function Navbar() {
    const { user, isLoading, isAdmin, logout } = useAuth();
    const { cartCount } = useCart();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Berhasil logout.");
            navigate("/login", { replace: true });
        } catch {
            toast.error("Terjadi kesalahan saat logout.");
        }
    };

    const navClass = ({ isActive }) =>
        `nav-link${isActive ? " nav-link-active" : ""}`;

    return (
        <header className="site-header">
            <div className="navbar-container">
                <Link to="/" className="brand">
                    <span className="brand-mark">M</span>
                    <span>
                        Moto<span className="brand-accent">Parts</span>
                    </span>
                </Link>

                <nav className="navbar-links" aria-label="Navigasi utama">
                    <NavLink to="/" end className={navClass}>
                        Beranda
                    </NavLink>

                    {user && !isAdmin && (
                        <NavLink to="/my-orders" className={navClass}>
                            Pesanan Saya
                        </NavLink>
                    )}

                    {isAdmin && (
                        <NavLink to="/admin" className={navClass}>
                            Dashboard Admin
                        </NavLink>
                    )}
                </nav>

                <div className="navbar-actions">
                    {!isLoading && user && !isAdmin && (
                        <Link to="/cart" className="cart-link">
                            Keranjang
                            <span className="cart-badge">{cartCount}</span>
                        </Link>
                    )}

                    {!isLoading && !user && (
                        <>
                            <Link to="/login" className="button button-outline">
                                Masuk
                            </Link>

                            <Link to="/register" className="button button-primary">
                                Daftar
                            </Link>
                        </>
                    )}

                    {!isLoading && user && (
                        <div className="navbar-user">
                            <span className="navbar-user-name">
                                {user.name}
                            </span>

                            <button
                                type="button"
                                className="button button-outline"
                                onClick={handleLogout}
                            >
                                Keluar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
