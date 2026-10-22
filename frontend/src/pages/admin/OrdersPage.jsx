import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import api from "../../lib/api";

const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

const formatDate = (value) => {
    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(date);
};

const statusLabels = {
    pending: "Menunggu konfirmasi",
    confirmed: "Dikonfirmasi",
    processing: "Sedang diproses",
    shipped: "Dikirim",
    completed: "Selesai",
    cancelled: "Dibatalkan",
};

const allowedTransitions = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["completed"],
    completed: [],
    cancelled: [],
};

export default function OrdersPage() {
    const queryClient = useQueryClient();

    const [page, setPage] = useState(1);
    const [statusSelections, setStatusSelections] = useState({});

    const ordersQuery = useQuery({
        queryKey: ["admin-orders", page],
        queryFn: async () => {
            const response = await api.get("/orders", {
                params: { page },
            });

            return response.data;
        },
    });

    const statusMutation = useMutation({
        mutationFn: async ({ orderId, status }) => {
            return api.patch(
                `/admin/orders/${orderId}/status`,
                { status }
            );
        },
        onSuccess: () => {
            toast.success("Status pesanan berhasil diperbarui.");

            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            queryClient.invalidateQueries({ queryKey: ["my-orders"] });
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.message ||
                "Gagal memperbarui status pesanan."
            );
        },
    });

    const orders = ordersQuery.data?.data ?? [];
    const pagination = ordersQuery.data?.meta;

    const currentPage = pagination?.current_page ?? page;
    const lastPage = pagination?.last_page ?? 1;

    const handleStatusChange = (orderId, status) => {
        setStatusSelections((current) => ({
            ...current,
            [orderId]: status,
        }));
    };

    const handleUpdateStatus = (order) => {
        const status = statusSelections[order.id];

        if (!status) {
            toast.error("Pilih status baru terlebih dahulu.");
            return;
        }

        const validStatuses = allowedTransitions[order.status] ?? [];

        if (!validStatuses.includes(status)) {
            toast.error("Perubahan status tersebut tidak diizinkan.");
            return;
        }

        const confirmed = window.confirm(
            `Ubah status pesanan ${order.order_number} menjadi "${statusLabels[status]}"?`
        );

        if (!confirmed) return;

        statusMutation.mutate({
            orderId: order.id,
            status,
        });
    };

    return (
        <main className="page-container admin-orders-page">
            <div className="admin-page-heading">
                <div>
                    <p className="eyebrow">ORDER MANAGEMENT</p>
                    <h1>Pesanan Pelanggan</h1>
                    <p>Periksa transaksi dan proses pesanan yang masuk.</p>
                </div>

                <button
                    type="button"
                    className="button button-outline"
                    onClick={() => ordersQuery.refetch()}
                    disabled={ordersQuery.isFetching}
                >
                    {ordersQuery.isFetching ? "Memuat..." : "Muat Ulang"}
                </button>
            </div>

            {ordersQuery.isLoading && (
                <p className="page-loading" role="status">
                    Memuat pesanan...
                </p>
            )}

            {ordersQuery.isError && (
                <div className="error-state" role="alert">
                    <h2>Data pesanan gagal dimuat</h2>
                    <p>
                        {ordersQuery.error?.response?.data?.message ||
                            "Pastikan server backend berjalan dan akun memiliki akses."}
                    </p>

                    <button
                        type="button"
                        className="button button-primary"
                        onClick={() => ordersQuery.refetch()}
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {!ordersQuery.isLoading &&
                !ordersQuery.isError &&
                orders.length === 0 && (
                    <div className="empty-state">
                        <h2>Belum ada pesanan</h2>
                        <p>Pesanan pelanggan akan tampil di halaman ini.</p>
                    </div>
                )}

            {!ordersQuery.isError && orders.length > 0 && (
                <>
                    <section className="orders-list">
                        {orders.map((order) => {
                            const nextStatuses =
                                allowedTransitions[order.status] ?? [];

                            const selectedStatus =
                                statusSelections[order.id] ?? "";

                            return (
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
                                            {statusLabels[order.status] || order.status}
                                        </span>
                                    </header>

                                    <section className="admin-order-customer">
                                        <h3>Informasi Pelanggan</h3>

                                        <p>
                                            <strong>Nama:</strong> {order.customer_name}
                                        </p>

                                        <p>
                                            <strong>Telepon:</strong> {order.customer_phone}
                                        </p>

                                        <p>
                                            <strong>Alamat:</strong> {order.shipping_address}
                                        </p>

                                        <p>
                                            <strong>Pembayaran:</strong>{" "}
                                            {order.payment_method === "cod"
                                                ? "COD"
                                                : order.payment_method === "bank_transfer"
                                                    ? "Transfer bank"
                                                    : "-"}
                                        </p>
                                    </section>

                                    <section className="order-items">
                                        <h3>Rincian Produk</h3>

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
                                    </section>

                                    <div className="order-card-footer">
                                        <div className="summary-row">
                                            <span>Subtotal</span>
                                            <span>{formatRupiah(order.subtotal)}</span>
                                        </div>

                                        <div className="summary-row">
                                            <span>Pengiriman</span>
                                            <span>
                                                {formatRupiah(order.shipping_cost)}
                                            </span>
                                        </div>

                                        <div className="order-total">
                                            <span>Total</span>
                                            <strong>{formatRupiah(order.total)}</strong>
                                        </div>
                                    </div>

                                    {nextStatuses.length > 0 && (
                                        <div className="admin-order-status-form">
                                            <div className="form-group">
                                                <label htmlFor={`status-${order.id}`}>
                                                    Ubah status pesanan
                                                </label>

                                                <select
                                                    id={`status-${order.id}`}
                                                    value={selectedStatus}
                                                    onChange={(event) =>
                                                        handleStatusChange(
                                                            order.id,
                                                            event.target.value
                                                        )
                                                    }
                                                >
                                                    <option value="">
                                                        Pilih status berikutnya
                                                    </option>

                                                    {nextStatuses.map((status) => (
                                                        <option key={status} value={status}>
                                                            {statusLabels[status]}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <button
                                                type="button"
                                                className="button button-primary"
                                                disabled={
                                                    statusMutation.isPending ||
                                                    !selectedStatus
                                                }
                                                onClick={() => handleUpdateStatus(order)}
                                            >
                                                Simpan Status
                                            </button>
                                        </div>
                                    )}

                                    {nextStatuses.length === 0 && (
                                        <p className="summary-note">
                                            Pesanan ini sudah berada pada status akhir.
                                        </p>
                                    )}
                                </article>
                            );
                        })}
                    </section>

                    {pagination && lastPage > 1 && (
                        <nav className="pagination" aria-label="Pagination pesanan admin">
                            <button
                                type="button"
                                className="button button-outline"
                                disabled={currentPage <= 1 || ordersQuery.isFetching}
                                onClick={() => setPage((current) => current - 1)}
                            >
                                Sebelumnya
                            </button>

                            <span>
                                Halaman {currentPage} dari {lastPage}
                            </span>

                            <button
                                type="button"
                                className="button button-outline"
                                disabled={
                                    currentPage >= lastPage ||
                                    ordersQuery.isFetching
                                }
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Berikutnya
                            </button>
                        </nav>
                    )}
                </>
            )}
        </main>
    );
}
