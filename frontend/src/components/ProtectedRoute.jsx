import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({
    children,
    requireAdmin = false,
}) {
    const { user, isLoading, isAdmin } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="page-loading" role="status">
                <div className="loading-spinner" />
                <p>Memeriksa sesi pengguna...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children ?? <Outlet />;
}
