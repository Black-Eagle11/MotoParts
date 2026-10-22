import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { useAuth } from "../contexts/AuthContext";

export default function RegisterPage() {
    const { register, user, isLoading } = useAuth();
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!isLoading && user) {
            navigate(
                user.role === "admin" ? "/admin" : "/",
                { replace: true }
            );
        }
    }, [user, isLoading, navigate]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage("");

        if (password !== passwordConfirmation) {
            setErrorMessage("Konfirmasi password tidak cocok.");
            return;
        }

        setIsSubmitting(true);

        try {
            await register({
                name: name.trim(),
                email: email.trim(),
                password,
                password_confirmation: passwordConfirmation,
            });

            toast.success("Registrasi berhasil!");

            navigate("/", { replace: true });
        } catch (error) {
            const response = error.response?.data;

            const message =
                response?.errors?.email?.[0] ||
                response?.errors?.password?.[0] ||
                response?.errors?.name?.[0] ||
                response?.message ||
                "Registrasi gagal. Periksa kembali data yang dimasukkan.";

            setErrorMessage(message);
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <main className="auth-page">
                <p role="status">Memeriksa sesi pengguna...</p>
            </main>
        );
    }

    if (user) {
        return null;
    }

    return (
        <main className="auth-page">
            <section className="auth-card">
                <Link to="/" className="auth-brand">
                    Moto<span>Parts</span>
                </Link>

                <p className="eyebrow">GABUNG DENGAN MOTOPARTS</p>
                <h1>Buat akun baru</h1>

                <p className="auth-description">
                    Daftar untuk menyimpan keranjang dan memesan sparepart motor.
                </p>

                {errorMessage && (
                    <div className="form-error" role="alert">
                        {errorMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="form-group">
                        <label htmlFor="name">Nama lengkap</label>
                        <input
                            id="name"
                            type="text"
                            autoComplete="name"
                            placeholder="Nama lengkap"
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Alamat email</label>
                        <input
                            id="email"
                            type="email"
                            autoComplete="email"
                            placeholder="nama@email.com"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Minimal 8 karakter"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            minLength={8}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password_confirmation">
                            Konfirmasi password
                        </label>
                        <input
                            id="password_confirmation"
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                            value={passwordConfirmation}
                            onChange={(event) =>
                                setPasswordConfirmation(event.target.value)
                            }
                            minLength={8}
                            required
                        />
                    </div>

                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={showPassword}
                            onChange={(event) =>
                                setShowPassword(event.target.checked)
                            }
                        />
                        Tampilkan password
                    </label>

                    <button
                        type="submit"
                        className="button button-primary auth-submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? "Membuat akun..." : "Daftar Sekarang"}
                    </button>
                </form>

                <p className="auth-switch">
                    Sudah punya akun? <Link to="/login">Masuk</Link>
                </p>

                <Link to="/" className="back-link">
                    ← Kembali ke toko
                </Link>
            </section>
        </main>
    );
}
