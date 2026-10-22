
import { useEffect, useState } from "react";
import {
    Link,
    useLocation,
    useNavigate,
} from "react-router-dom";

import toast from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
    const { login, user, isLoading } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loginFlowActive, setLoginFlowActive] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Menentukan halaman tujuan berdasarkan role dan URL sebelumnya.
    const redirectAfterLogin = (loggedInUser) => {
        if (loggedInUser.role === "admin") {
            return "/admin";
        }

        const requestedPath = location.state?.from?.pathname;

        if (
            typeof requestedPath === "string" &&
            requestedPath.startsWith("/") &&
            !requestedPath.startsWith("//") &&
            requestedPath !== "/login" &&
            requestedPath !== "/register"
        ) {
            return requestedPath;
        }

        return "/";
    };

    // Redirect pengguna yang sudah login sebelumnya.
    // LoginFlowActive mencegah redirect ini mendahului navigasi
    // yang dilakukan setelah proses login berhasil.
    useEffect(() => {
        if (isLoading || !user || loginFlowActive) {
            return;
        }

        navigate(
            user.role === "admin" ? "/admin" : "/",
            { replace: true }
        );
    }, [user, isLoading, loginFlowActive, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        if (!email.trim() || !password) {
            setErrorMessage("Email dan password wajib diisi.");
            return;
        }

        setLoginFlowActive(true);
        setIsSubmitting(true);

        try {
            const loggedInUser = await login(
                email.trim(),
                password
            );

            toast.success("Login berhasil!");

            navigate(redirectAfterLogin(loggedInUser), {
                replace: true,
            });
        } catch (error) {
            setLoginFlowActive(false);

            const response = error.response?.data;

            const message =
                response?.errors?.email?.[0] ||
                response?.errors?.password?.[0] ||
                response?.message ||
                error.message ||
                "Login gagal. Periksa kembali email dan password.";

            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <main className="auth-page">
                <div className="page-loading" role="status">
                    Memeriksa sesi pengguna...
                </div>
            </main>
        );
    }

    // Saat sudah login, tunggu proses redirect.
    // Jika login baru saja berhasil, tampilkan status pengalihan.
    if (user && !loginFlowActive) {
        return null;
    }

    if (user && loginFlowActive) {
        return (
            <main className="auth-page">
                <div className="page-loading" role="status">
                    Login berhasil. Mengalihkan halaman...
                </div>
            </main>
        );
    }

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link
                    to="/"
                    className="auth-brand"
                    aria-label="MotoParts beranda"
                >
                    Moto<span>Parts</span>
                </Link>

                <p className="eyebrow">
                    SELAMAT DATANG KEMBALI
                </p>

                <h1>Masuk ke akunmu</h1>

                <p className="auth-description">
                    Masuk untuk berbelanja sparepart dan
                    memantau pesananmu.
                </p>

                {errorMessage && (
                    <div className="form-error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="email">Alamat email</label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="nama@email.com"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            maxLength={255}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>

                        <div className="password-input-wrap">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                                required
                                disabled={isSubmitting}
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword((current) => !current)
                                }
                                aria-label={
                                    showPassword
                                        ? "Sembunyikan password"
                                        : "Tampilkan password"
                                }
                                aria-pressed={showPassword}
                                disabled={isSubmitting}
                            >
                                {showPassword ? "Sembunyikan" : "Lihat"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="button button-primary auth-submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Memproses login..." : "Masuk"}
                    </button>
                </form>

                <p className="auth-switch">
                    Belum punya akun?{" "}
                    <Link to="/register">Daftar sekarang</Link>
                </p>

                <Link to="/" className="back-link">
                    ← Kembali ke toko
                </Link>
            </section>
        </main>
    );
}
