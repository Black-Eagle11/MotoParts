import { useState } from "react";
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
} from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

const formatCurrency = (amount) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

const getProduct = (item) => item?.product ?? item ?? {};

const getProductId = (item) => {
    const product = getProduct(item);

    return item?.product_id ?? product?.id ?? item?.id;
};

const getPrice = (item) => {
    const product = getProduct(item);

    return Number(item?.price ?? product?.price ?? 0) || 0;
};

const getProductName = (item) => {
    const product = getProduct(item);

    return product?.name ?? item?.name ?? "Produk";
};

const getImageUrl = (item) => {
    const product = getProduct(item);

    return (
        item?.image_url ??
        product?.image_url ??
        item?.imageUrl ??
        product?.imageUrl ??
        item?.image ??
        product?.image ??
        ""
    );
};

const getFirstError = (errors, ...fields) => {
    for (const field of fields) {
        const message = errors?.[field];

        if (Array.isArray(message) && message.length > 0) {
            return message[0];
        }

        if (typeof message === "string" && message) {
            return message;
        }
    }

    return "";
};

function FieldError({ errors, fields }) {
    const message = getFirstError(errors, ...fields);

    if (!message) {
        return null;
    }

    return <p className="field-error">{message}</p>;
}

const FIELD_ERROR_KEYS = {
    shipping_name: [
        "shipping_name",
        "recipient_name",
        "customer_name",
        "receiver_name",
        "name",
    ],
    shipping_phone: [
        "shipping_phone",
        "recipient_phone",
        "phone_number",
        "phone",
    ],
    shipping_address: [
        "shipping_address",
        "recipient_address",
        "address",
    ],
    shipping_city: ["shipping_city", "city"],
    shipping_postal_code: [
        "shipping_postal_code",
        "postal_code",
    ],
    notes: ["notes"],
};

export default function CheckoutPage() {
    const { user, isLoading: isAuthLoading } = useAuth();
    const cart = useCart();

    const navigate = useNavigate();
    const location = useLocation();

    const cartItems = Array.isArray(cart.cartItems)
        ? cart.cartItems
        : Array.isArray(cart.items)
            ? cart.items
            : [];

    const clearCart = cart.clearCart;

    const subtotalFromItems = cartItems.reduce(
        (sum, item) =>
            sum + getPrice(item) * (Number(item.quantity) || 1),
        0,
    );

    const subtotal =
        Number(cart.cartSubtotal ?? subtotalFromItems) || 0;

    const checkoutItems = cartItems.map((item) => ({
        product_id: Number(getProductId(item)),
        quantity: Number(item.quantity),
    }));

    const [formData, setFormData] = useState({
        shipping_name: user?.name ?? "",
        shipping_phone: "",
        shipping_address: "",
        shipping_city: "",
        shipping_postal_code: "",
        notes: "",
    });

    const [fieldErrors, setFieldErrors] = useState({});

    const createOrderMutation = useMutation({
        mutationFn: async (payload) => {
            const response = await api.post("/orders", payload);

            return response.data;
        },

        onSuccess: (responseData) => {
            const order =
                responseData?.data ??
                responseData?.order ??
                responseData;

            clearCart?.();

            toast.success("Pesanan berhasil dibuat!");

            navigate("/orders", {
                replace: true,
                state: {
                    createdOrder: order,
                },
            });
        },

        onError: (error) => {
            const responseData = error.response?.data;
            const errors = responseData?.errors ?? {};

            setFieldErrors(errors);

            // Menampilkan detail validasi untuk membantu diagnosis.
            console.error(
                "Checkout HTTP status:",
                error.response?.status,
            );

            console.error(
                "Checkout validation errors:",
                errors,
            );

            if (error.response?.status === 401) {
                toast.error(
                    "Sesi login berakhir. Silakan login kembali.",
                );

                navigate("/login", {
                    replace: true,
                    state: { from: location },
                });

                return;
            }

            if (error.response?.status === 403) {
                toast.error(
                    responseData?.message ??
                    "Akun ini tidak diizinkan membuat pesanan.",
                );

                return;
            }

            if (error.response?.status === 422) {
                const messages = Object.values(errors)
                    .flatMap((value) =>
                        Array.isArray(value) ? value : [value],
                    )
                    .filter(
                        (value) =>
                            typeof value === "string" && value.length > 0,
                    );

                toast.error(
                    messages[0] ??
                    responseData?.message ??
                    "Data pesanan belum valid.",
                );

                return;
            }

            toast.error(
                responseData?.message ??
                "Pesanan gagal dibuat. Periksa koneksi backend.",
            );
        },
    });

    const handleChange = (event) => {
        const { name, value } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: value,
        }));

        const errorKeys = FIELD_ERROR_KEYS[name] ?? [name];

        setFieldErrors((previous) => {
            const next = { ...previous };

            errorKeys.forEach((key) => {
                delete next[key];
            });

            return next;
        });
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setFieldErrors({});

        if (createOrderMutation.isPending) {
            return;
        }

        if (cartItems.length === 0) {
            toast.error("Keranjang masih kosong.");
            return;
        }

        const invalidItems = checkoutItems.some(
            (item) =>
                !Number.isInteger(item.product_id) ||
                item.product_id <= 0 ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1,
        );

        if (invalidItems) {
            toast.error(
                "Ada produk dengan data keranjang tidak valid. Tambahkan kembali produknya.",
            );

            return;
        }

        const recipientName = formData.shipping_name.trim();
        const recipientPhone = formData.shipping_phone.trim();
        const streetAddress = formData.shipping_address.trim();
        const city = formData.shipping_city.trim();
        const postalCode = formData.shipping_postal_code.trim();
        const notes = formData.notes.trim();

        const localErrors = {};

        if (!recipientName) {
            localErrors.shipping_name = [
                "Nama penerima wajib diisi.",
            ];
        }

        if (!recipientPhone) {
            localErrors.shipping_phone = [
                "Nomor telepon wajib diisi.",
            ];
        }

        if (!streetAddress) {
            localErrors.shipping_address = [
                "Alamat lengkap wajib diisi.",
            ];
        }

        if (!city) {
            localErrors.shipping_city = [
                "Kota atau kabupaten wajib diisi.",
            ];
        }

        if (Object.keys(localErrors).length > 0) {
            setFieldErrors(localErrors);

            toast.error(
                Object.values(localErrors)[0][0],
            );

            return;
        }

        if (recipientName.length > 150) {
            toast.error(
                "Nama penerima maksimal 150 karakter.",
            );

            return;
        }

        if (recipientPhone.length > 30) {
            toast.error(
                "Nomor telepon maksimal 30 karakter.",
            );

            return;
        }

        const fullAddress = [
            streetAddress,
            city,
            postalCode ? `Kode Pos ${postalCode}` : "",
        ]
            .filter(Boolean)
            .join(", ");

        /*
         * Payload kompatibel dengan beberapa nama field
         * yang umum digunakan pada validasi Laravel.
         *
         * Catatan:
         * Backend tetap harus mempunyai aturan validasi
         * dan pemetaan field yang sesuai.
         */
        const payload = {
            items: checkoutItems,

            // Nama penerima
            name: recipientName,
            recipient_name: recipientName,
            shipping_name: recipientName,
            customer_name: recipientName,
            receiver_name: recipientName,

            // Nomor telepon
            phone_number: recipientPhone,
            recipient_phone: recipientPhone,
            shipping_phone: recipientPhone,
            phone: recipientPhone,

            // Alamat pengiriman
            address: fullAddress,
            recipient_address: fullAddress,
            shipping_address: fullAddress,

            // Lokasi
            city,
            shipping_city: city,
            postal_code: postalCode || null,
            shipping_postal_code: postalCode || null,

            // Catatan opsional
            notes: notes || null,
        };

        createOrderMutation.mutate(payload);
    };

    if (isAuthLoading) {
        return (
            <main className="page-container">
                <p role="status">Memeriksa sesi login...</p>
            </main>
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

    if (cartItems.length === 0) {
        return (
            <main className="page-container">
                <section className="form-section">
                    <h1>Keranjang masih kosong</h1>

                    <p>
                        Tambahkan produk sebelum melakukan checkout.
                    </p>

                    <Link
                        to="/"
                        className="button button-primary"
                    >
                        Belanja Sekarang
                    </Link>
                </section>
            </main>
        );
    }

    const isSubmitting = createOrderMutation.isPending;

    const totalQuantity = cartItems.reduce(
        (sum, item) =>
            sum + (Number(item.quantity) || 1),
        0,
    );

    return (
        <main className="page-container checkout-page">
            <header className="page-heading">
                <p className="eyebrow">MotoParts Store</p>

                <h1>Checkout</h1>

                <p>
                    Pastikan produk dan informasi pengiriman sudah benar.
                </p>

                <Link to="/cart" className="back-link">
                    ← Kembali ke Keranjang
                </Link>
            </header>

            <div className="checkout-layout">
                <section>
                    <form
                        onSubmit={handleSubmit}
                        className="checkout-form"
                        noValidate
                    >
                        <section className="form-section">
                            <h2>Informasi Pengiriman</h2>

                            <div className="form-group">
                                <label htmlFor="shipping_name">
                                    Nama penerima
                                </label>

                                <input
                                    id="shipping_name"
                                    name="shipping_name"
                                    type="text"
                                    autoComplete="name"
                                    value={formData.shipping_name}
                                    onChange={handleChange}
                                    maxLength={150}
                                    required
                                    aria-invalid={Boolean(
                                        getFirstError(
                                            fieldErrors,
                                            ...FIELD_ERROR_KEYS.shipping_name,
                                        ),
                                    )}
                                />

                                <FieldError
                                    errors={fieldErrors}
                                    fields={FIELD_ERROR_KEYS.shipping_name}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="shipping_phone">
                                    Nomor telepon
                                </label>

                                <input
                                    id="shipping_phone"
                                    name="shipping_phone"
                                    type="tel"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    value={formData.shipping_phone}
                                    onChange={handleChange}
                                    maxLength={30}
                                    placeholder="Contoh: 081234567890"
                                    required
                                    aria-invalid={Boolean(
                                        getFirstError(
                                            fieldErrors,
                                            ...FIELD_ERROR_KEYS.shipping_phone,
                                        ),
                                    )}
                                />

                                <FieldError
                                    errors={fieldErrors}
                                    fields={FIELD_ERROR_KEYS.shipping_phone}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="shipping_address">
                                    Alamat lengkap
                                </label>

                                <textarea
                                    id="shipping_address"
                                    name="shipping_address"
                                    autoComplete="street-address"
                                    rows={4}
                                    value={formData.shipping_address}
                                    onChange={handleChange}
                                    maxLength={1000}
                                    placeholder="Jalan, nomor rumah, desa, dan kecamatan"
                                    required
                                    aria-invalid={Boolean(
                                        getFirstError(
                                            fieldErrors,
                                            ...FIELD_ERROR_KEYS.shipping_address,
                                        ),
                                    )}
                                />

                                <FieldError
                                    errors={fieldErrors}
                                    fields={FIELD_ERROR_KEYS.shipping_address}
                                />
                            </div>

                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="shipping_city">
                                        Kota/Kabupaten
                                    </label>

                                    <input
                                        id="shipping_city"
                                        name="shipping_city"
                                        type="text"
                                        autoComplete="address-level2"
                                        value={formData.shipping_city}
                                        onChange={handleChange}
                                        maxLength={100}
                                        required
                                        aria-invalid={Boolean(
                                            getFirstError(
                                                fieldErrors,
                                                ...FIELD_ERROR_KEYS.shipping_city,
                                            ),
                                        )}
                                    />

                                    <FieldError
                                        errors={fieldErrors}
                                        fields={FIELD_ERROR_KEYS.shipping_city}
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="shipping_postal_code">
                                        Kode pos
                                    </label>

                                    <input
                                        id="shipping_postal_code"
                                        name="shipping_postal_code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="postal-code"
                                        value={formData.shipping_postal_code}
                                        onChange={handleChange}
                                        maxLength={10}
                                        aria-invalid={Boolean(
                                            getFirstError(
                                                fieldErrors,
                                                ...FIELD_ERROR_KEYS.shipping_postal_code,
                                            ),
                                        )}
                                    />

                                    <FieldError
                                        errors={fieldErrors}
                                        fields={FIELD_ERROR_KEYS.shipping_postal_code}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">
                                    Catatan pesanan (opsional)
                                </label>

                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    maxLength={1000}
                                    placeholder="Catatan tambahan untuk pesanan"
                                />

                                <FieldError
                                    errors={fieldErrors}
                                    fields={FIELD_ERROR_KEYS.notes}
                                />
                            </div>

                            <FieldError
                                errors={fieldErrors}
                                fields={["items"]}
                            />
                        </section>

                        <section className="form-section">
                            <h2>Produk yang Dipesan</h2>

                            <div className="checkout-products">
                                {cartItems.map((item, index) => {
                                    const productId = getProductId(item);
                                    const quantity = Number(item.quantity) || 1;
                                    const price = getPrice(item);
                                    const imageUrl = getImageUrl(item);
                                    const name = getProductName(item);

                                    return (
                                        <article
                                            className="checkout-product"
                                            key={productId ?? `${name}-${index}`}
                                        >
                                            <div>
                                                <strong>{name}</strong>

                                                <p>
                                                    {formatCurrency(price)} × {quantity}
                                                </p>
                                            </div>

                                            <span>
                                                {formatCurrency(price * quantity)}
                                            </span>

                                            {imageUrl && (
                                                <img
                                                    src={imageUrl}
                                                    alt={name}
                                                    width="56"
                                                    height="56"
                                                    style={{
                                                        objectFit: "cover",
                                                        borderRadius: "8px",
                                                    }}
                                                />
                                            )}
                                        </article>
                                    );
                                })}
                            </div>
                        </section>

                        <button
                            type="submit"
                            className="button button-primary checkout-submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting
                                ? "Sedang Membuat Pesanan..."
                                : `Buat Pesanan • ${formatCurrency(subtotal)}`}
                        </button>

                        <p className="summary-note">
                            Harga dan ketersediaan stok akan diverifikasi
                            kembali oleh server saat pesanan dibuat.
                        </p>
                    </form>
                </section>

                <aside className="checkout-summary">
                    <h2>Ringkasan Pembayaran</h2>

                    <div className="summary-row">
                        <span>Jumlah jenis produk</span>
                        <span>{cartItems.length}</span>
                    </div>

                    <div className="summary-row">
                        <span>Total barang</span>
                        <span>{totalQuantity}</span>
                    </div>

                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="summary-row">
                        <span>Biaya pengiriman</span>
                        <span>Gratis</span>
                    </div>

                    <div className="summary-total">
                        <span>Total sementara</span>
                        <strong>{formatCurrency(subtotal)}</strong>
                    </div>

                    <p className="summary-note">
                        Total akhir dan ketersediaan stok akan ditentukan
                        oleh server.
                    </p>

                    <Link to="/cart" className="back-link">
                        ← Ubah isi keranjang
                    </Link>
                </aside>
            </div>
        </main>
    );
}
