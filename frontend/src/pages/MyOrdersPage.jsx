import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";

const formatRupiah = (amount) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));

const statusLabels = {
    pending: "Menunggu konfirmasi",
    confirmed: "Dikonfirmasi",
    processing: "Sedang diproses",
    shipped: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan",
};

const paymentLabels = {
    unpaid: "Belum dibayar",
    paid: "Sudah dibayar",
    refunded: "Dana dikembalikan",
};

const formatDate = (date) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(parsedDate);
};

export default function MyOrdersPage() {
    const [page, setPage] = useState(1);

    const {
        data: orderResponse,
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useQuery({
        queryKey: ["my-orders", page],
        queryFn: async () => {
            const response = await api.get("/orders", {
                params: { page },
            });

            return response.data;
        },
        staleTime: 15_000,
    });

    const orders = orderResponse?.data ?? [];
    const pagination = orderResponse?.meta;

    const currentPage = pagination?.current_page ?? page;
    const lastPage = pagination?.last_page ?? 1;

    if (isLoading) {
        return (
            <main className="page-container">
                <div className="page-loading" role="status">
                    Memuat riwayat pesanan...
                </div>
            </main>
        );
    }

    if (isError) {
        return (
            <main className="page-container">
                <div className="error-state" role="alert">
                    <h1>Riwayat pesanan belum dapat dimuat</h1>

                    <p>
                        {error?.response?.data?.message ||
                            "Periksa koneksi ke server MotoParts."}
                    </p>

                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => refetch()}
                    >
                        Coba Lagi
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="page-container my-orders-page">
            <div className="page-heading">
                <p className="eyebrow">AKUN PELANGGAN</p>
                <h1>Pesanan Saya</h1>

                <p>
                    Pantau status dan rincian transaksi sparepart kamu.
                </p>
            </div>

            <div className="orders-toolbar">
                <span>
                    {pagination?.total ?? orders.length} pesanan
                </span>

                <button
                    type="button"
                    className="button button-outline"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    {isFetching ? "Memuat..." : "Muat Ulang"}
                </button>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon" aria-hidden="true">
                        📦
                    </div>

                    <h2>Belum ada pesanan</h2>

                    <p>
                        Pesanan yang berhasil kamu buat akan muncul di sini.
                    </p>

                    <Link to="/" className="button button-primary">
                        Belanja Sekarang
                    </Link>
                </div>
            ) : (
                <>
                    <div className="orders-list">
                        {orders.map((order) => (
                            <article
                                key={order.id}
                                className="order-card"
                            >
                                <header className="order-card-header">
                                    <div>
                                        <p className="order-number-label">
                                            Nomor pesanan
                                        </p>

                                        <h2 className="order-number">
                                            {order.order_number}
                                        </h2>

                                        <p className="order-date">
                                            {formatDate(order.created_at)}
                                        </p>
                                    </div>

                                    <span
                                        className={`status-badge status-${order.status}`}
                                    >
                                        {statusLabels[order.status] ||
                                            order.status}
                                    </span>
                                </header>

                                <div className="order-items">
                                    {(order.items ?? []).map((item) => (
                                        <div
                                            key={item.id}
                                            className="order-item"
                                        >
                                            <div>
                                                <strong>{item.product_name}</strong>

                                                <p>
                                                    SKU: {item.product_sku || "-"}
                                                </p>

                                                <p>
                                                    {item.quantity} ×{" "}
                                                    {formatRupiah(item.unit_price)}
                                                </p>
                                            </div>

                                            <strong>
                                                {formatRupiah(item.subtotal)}
                                            </strong>
                                        </div>
                                    ))}
                                </div>

                                <div className="order-card-footer">
                                    <div className="order-payment-info">
                                        <span>
                                            Pembayaran:{" "}
                                            {paymentLabels[order.payment_status] ||
                                                order.payment_status}
                                        </span>

                                        <span>
                                            {order.payment_method === "cod"
                                                ? "COD"
                                                : order.payment_method === "bank_transfer"
                                                    ? "Transfer bank"
                                                    : "-"}
                                        </span>
                                    </div>

                                    <div className="order-total">
                                        <span>Total pesanan</span>
                                        <strong>
                                            {formatRupiah(order.total)}
                                        </strong>
                                    </div>
                                </div>

                                <div className="order-shipping-address">
                                    <strong>Alamat pengiriman</strong>
                                    <p>{order.shipping_address}</p>
                                </div>
                            </article>
                        ))}
                    </div>

                    <nav
                        className="pagination"
                        aria-label="Pagination pesanan"
                    >
                        <button
                            type="button"
                            className="button button-outline"
                            disabled={currentPage <= 1 || isFetching}
                            onClick={() =>
                                setPage((current) => current - 1)
                            }
                        >
                            Sebelumnya
                        </button>

                        <span>
                            Halaman {currentPage} dari {lastPage}
                        </span>

                        <button
                            type="button"
                            className="button button-outline"
                            disabled={currentPage >= lastPage || isFetching}
                            onClick={() =>
                                setPage((current) => current + 1)
                            }
                        >
                            Berikutnya
                        </button>
                    </nav>
                </>
            )}
        </main>
    );
}
