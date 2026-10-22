import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import api from "../../lib/api";

const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value || 0));

export default function AdminDashboard() {
    const queryClient = useQueryClient();

    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [sort, setSort] = useState("newest");
    const [activeFilter, setActiveFilter] = useState("");
    const [page, setPage] = useState(1);

    const categoriesQuery = useQuery({
        queryKey: ["admin-categories"],
        queryFn: async () => {
            const response = await api.get("/categories", {
                params: { per_page: 100 },
            });

            return response.data.data ?? [];
        },
    });

    const productsQuery = useQuery({
        queryKey: [
            "admin-products",
            search,
            categoryId,
            sort,
            activeFilter,
            page,
        ],
        queryFn: async () => {
            const params = {
                page,
                per_page: 10,
                search: search || undefined,
                category_id: categoryId || undefined,
                sort,
                is_active:
                    activeFilter === "" ? undefined : activeFilter,
            };

            const response = await api.get("/products", { params });

            return response.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (productId) => {
            return api.delete(`/products/${productId}`);
        },
        onSuccess: () => {
            toast.success("Produk berhasil dihapus.");

            queryClient.invalidateQueries({ queryKey: ["admin-products"] });
            queryClient.invalidateQueries({ queryKey: ["products"] });
        },
        onError: (error) => {
            toast.error(
                error.response?.data?.message ||
                "Gagal menghapus produk."
            );
        },
    });

    const products = productsQuery.data?.data ?? [];
    const pagination = productsQuery.data?.meta;
    const categories = categoriesQuery.data ?? [];

    const currentPage = pagination?.current_page ?? page;
    const lastPage = pagination?.last_page ?? 1;
    const totalProducts = pagination?.total ?? products.length;

    const handleSearch = (event) => {
        event.preventDefault();
        setSearch(keyword.trim());
        setPage(1);
    };

    const handleDelete = (product) => {
        const confirmed = window.confirm(
            `Yakin ingin menghapus produk "${product.name}"?`
        );

        if (confirmed) {
            deleteMutation.mutate(product.id);
        }
    };

    const resetFilters = () => {
        setKeyword("");
        setSearch("");
        setCategoryId("");
        setSort("newest");
        setActiveFilter("");
        setPage(1);
    };

    return (
        <main className="page-container admin-dashboard">
            <div className="admin-page-heading">
                <div>
                    <p className="eyebrow">ADMINISTRATION</p>
                    <h1>Manajemen Sparepart</h1>
                    <p>Kelola katalog, harga, kategori, dan stok produk.</p>
                </div>

                <Link
                    to="/admin/products/new"
                    className="button button-primary"
                >
                    + Tambah Produk
                </Link>
            </div>

            <section className="admin-stats">
                <article className="admin-stat-card">
                    <span>Total produk sesuai filter</span>
                    <strong>{totalProducts}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Produk dengan stok habis</span>
                    <strong>
                        {products.filter((product) => Number(product.stock) === 0).length}
                    </strong>
                </article>

                <article className="admin-stat-card">
                    <span>Produk aktif pada halaman ini</span>
                    <strong>
                        {products.filter((product) => product.is_active).length}
                    </strong>
                </article>
            </section>

            <section className="admin-table-section">
                <form className="admin-filters" onSubmit={handleSearch}>
                    <input
                        type="search"
                        placeholder="Cari nama atau SKU..."
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        aria-label="Cari produk"
                    />

                    <select
                        value={categoryId}
                        onChange={(event) => {
                            setCategoryId(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter kategori"
                    >
                        <option value="">Semua kategori</option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={activeFilter}
                        onChange={(event) => {
                            setActiveFilter(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter status produk"
                    >
                        <option value="">Semua status</option>
                        <option value="1">Aktif</option>
                        <option value="0">Nonaktif</option>
                    </select>

                    <select
                        value={sort}
                        onChange={(event) => {
                            setSort(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Pengurutan produk"
                    >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="price_asc">Harga termurah</option>
                        <option value="price_desc">Harga termahal</option>
                        <option value="name_asc">Nama A–Z</option>
                    </select>

                    <button type="submit" className="button button-primary">
                        Cari
                    </button>

                    <button
                        type="button"
                        className="button button-outline"
                        onClick={resetFilters}
                    >
                        Reset
                    </button>
                </form>

                {productsQuery.isLoading && (
                    <p className="page-loading" role="status">
                        Memuat data produk...
                    </p>
                )}

                {productsQuery.isError && (
                    <div className="error-state" role="alert">
                        <p>
                            {productsQuery.error?.response?.data?.message ||
                                "Data produk gagal dimuat."}
                        </p>

                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => productsQuery.refetch()}
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {!productsQuery.isLoading &&
                    !productsQuery.isError &&
                    products.length === 0 && (
                        <div className="empty-state">
                            <h2>Belum ada produk</h2>
                            <p>Tambah produk baru atau ubah filter pencarian.</p>
                        </div>
                    )}

                {!productsQuery.isError && products.length > 0 && (
                    <div className="admin-table-wrapper">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Produk</th>
                                    <th>SKU</th>
                                    <th>Kategori</th>
                                    <th>Harga</th>
                                    <th>Stok</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map((product) => (
                                    <tr key={product.id}>
                                        <td>
                                            <div className="admin-product-cell">
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className="admin-product-thumbnail"
                                                    />
                                                ) : (
                                                    <div className="admin-product-placeholder">
                                                        ⚙️
                                                    </div>
                                                )}

                                                <span>{product.name}</span>
                                            </div>
                                        </td>

                                        <td>{product.sku}</td>
                                        <td>{product.category?.name || "-"}</td>
                                        <td>{formatRupiah(product.price)}</td>

                                        <td>
                                            <span
                                                className={
                                                    Number(product.stock) > 0
                                                        ? "stock-available"
                                                        : "stock-empty"
                                                }
                                            >
                                                {product.stock}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    product.is_active
                                                        ? "status-badge status-active"
                                                        : "status-badge status-inactive"
                                                }
                                            >
                                                {product.is_active ? "Aktif" : "Nonaktif"}
                                            </span>
                                        </td>

                                        <td>
                                            <div className="admin-actions">
                                                <Link
                                                    to={`/admin/products/${product.id}/edit`}
                                                    className="button button-outline"
                                                >
                                                    Edit
                                                </Link>

                                                <button
                                                    type="button"
                                                    className="button button-danger"
                                                    onClick={() => handleDelete(product)}
                                                    disabled={deleteMutation.isPending}
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && lastPage > 1 && (
                    <nav className="pagination" aria-label="Pagination admin">
                        <button
                            type="button"
                            className="button button-outline"
                            disabled={currentPage <= 1 || productsQuery.isFetching}
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
                            disabled={currentPage >= lastPage || productsQuery.isFetching}
                            onClick={() => setPage((current) => current + 1)}
                        >
                            Berikutnya
                        </button>
                    </nav>
                )}
            </section>
        </main>
    );
}
