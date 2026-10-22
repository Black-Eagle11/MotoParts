/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import api, { API_TOKEN_KEY } from "../lib/api";

const AuthContext = createContext(null);

function readToken() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage.getItem(API_TOKEN_KEY);
    } catch {
        return null;
    }
}

function removeToken() {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.removeItem(API_TOKEN_KEY);
    } catch (error) {
        console.error("Gagal menghapus token lokal:", error);
    }
}

function saveToken(token) {
    if (typeof window === "undefined") {
        throw new Error("Penyimpanan token hanya tersedia di browser.");
    }

    window.localStorage.setItem(API_TOKEN_KEY, token);
}

function normalizeUser(data) {
    if (!data || typeof data !== "object") {
        return null;
    }

    // Mendukung respons user langsung maupun { user: ... }.
    const user = data.user ?? data;

    if (user.id == null || !user.email) {
        return null;
    }

    return {
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        role: user.role ?? "customer",
    };
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);

    // Jika token sudah ada, tampilkan status loading sampai sesi diperiksa.
    // Dengan begitu kita tidak perlu setState secara sinkron di dalam effect.
    const [isLoading, setIsLoading] = useState(
        () => Boolean(readToken())
    );

    // Memulihkan sesi saat aplikasi pertama kali dibuka.
    useEffect(() => {
        const token = readToken();

        // Tanpa token, isLoading sudah false dari initial state.
        if (!token) {
            return undefined;
        }

        let cancelled = false;

        api
            .get("/user")
            .then((response) => {
                if (cancelled) {
                    return;
                }

                const currentUser = normalizeUser(response.data);

                if (!currentUser) {
                    removeToken();
                    setUser(null);
                    return;
                }

                setUser(currentUser);
            })
            .catch((error) => {
                if (cancelled) {
                    return;
                }

                const status = error.response?.status;

                // Token yang ditolak server tidak boleh dipakai lagi.
                if ([401, 403].includes(status)) {
                    removeToken();
                }

                setUser(null);
            })
            .finally(() => {
                if (!cancelled) {
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Refresh informasi user dari backend.
    const refreshUser = useCallback(async () => {
        const token = readToken();

        if (!token) {
            setUser(null);
            setIsLoading(false);
            return null;
        }

        try {
            const response = await api.get("/user");
            const currentUser = normalizeUser(response.data);

            if (!currentUser) {
                removeToken();
                setUser(null);
                return null;
            }

            setUser(currentUser);

            return currentUser;
        } catch (error) {
            const status = error.response?.status;

            if ([401, 403].includes(status)) {
                removeToken();
            }

            setUser(null);

            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Login.
    const login = useCallback(async (email, password) => {
        const response = await api.post("/login", {
            email: email.trim(),
            password,
        });

        const token = response.data?.token;
        const loggedInUser = normalizeUser(response.data);

        if (!token || !loggedInUser) {
            throw new Error(
                "Respons login dari server tidak memiliki token atau data user."
            );
        }

        // Simpan token sebelum mengubah state autentikasi.
        saveToken(token);

        setUser(loggedInUser);
        setIsLoading(false);

        return loggedInUser;
    }, []);

    // Registrasi pelanggan baru.
    const register = useCallback(async (formData) => {
        const response = await api.post("/register", formData);

        const token = response.data?.token;
        const registeredUser = normalizeUser(response.data);

        if (!token || !registeredUser) {
            throw new Error(
                "Respons registrasi dari server tidak lengkap."
            );
        }

        saveToken(token);

        setUser(registeredUser);
        setIsLoading(false);

        return registeredUser;
    }, []);

    // Logout: coba cabut token di server, lalu bersihkan sesi browser.
    const logout = useCallback(async () => {
        const token = readToken();

        try {
            if (token) {
                await api.post("/logout");
            }
        } catch (error) {
            if (error.response?.status !== 401) {
                console.error(
                    "Request logout ke server gagal:",
                    error.response?.data?.message || error.message
                );
            }
        } finally {
            removeToken();
            setUser(null);
            setIsLoading(false);
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: Boolean(user),
            isAdmin: user?.role === "admin",
            login,
            register,
            logout,
            refreshUser,
        }),
        [
            user,
            isLoading,
            login,
            register,
            logout,
            refreshUser,
        ]
    );

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);

    if (context === null) {
        throw new Error(
            "useAuth harus digunakan di dalam AuthProvider."
        );
    }

    return context;
}
