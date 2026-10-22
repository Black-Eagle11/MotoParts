import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import api from "../lib/api";
import ProductCard from "../components/ProductCard";

export default function StorePage() {
    const [keyword, setKeyword] = useState("");
    const [search, setSearch] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [sort, setSort] = useState("newest");
    const [page, setPage] = useState(1);

    const {
        data: categoryResponse,
        isLoading: categoriesLoading,
    } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const response = await api.get("/categories", {
                params: { per_page: 100 },
            });

            return response.data;
        },
        staleTime: 60_000,
    });

    const {
        data: productResponse,
        isLoading: productsLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ["products", search, categoryId, sort, page],
        queryFn: async () => {
            const response = await api.get("/products", {
                params: {
                    search: search || undefined,
                    category_id: categoryId || undefined,
                    sort,
                    page,
                    per_page: 12,
                },
            });

            return response.data;
        },
        staleTime: 30_000,
    });

    const categories = categoryResponse?.data ?? [];
    const products = productResponse?.data ?? [];
    const pagination = productResponse?.meta;

    const currentPage = pagination?.current_page ?? page;
    const lastPage = pagination?.last_page ?? 1;

    const handleSearch = (event) => {
        event.preventDefault();
        setPage(1);
        setSearch(keyword.trim());
    };

    const handleCategoryChange = (event) => {
        setCategoryId(event.target.value);
        setPage(1);
    };

    const handleSortChange = (event) => {
        setSort(event.target.value);
        setPage(1);
    };

    return (
        <main className="store-page">
            <section className="store-hero">
                <div className="store-hero-content">
                    <p className="eyebrow">MOTOPARTS ONLINE STORE</p>

                    <h1>
                        Temukan Sparepart
                        <br />
                        Terbaik untuk Motormu.
                    </h1>

                    <p className="store-hero-description">
                        Cari suku cadang, bandingkan harga, dan pesan
                        kebutuhan motor langsung dari satu tempat.
                    </p>

                    <a href="#catalog" className="button button-primary">
                        Jelajahi Produk
                    </a>
                </div>
            </section>

            <section id="catalog" className="catalog-section">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">KATALOG</p>
                        <h2>Sparepart Pilihan</h2>
                        <p>
                            Temukan produk berdasarkan nama, kategori, dan harga.
                        </p>
                    </div>
                </div>

                <form className="catalog-filters" onSubmit={handleSearch}>
                    <input
                        type="search"
                        value={keyword}
                        onChange={(event) => setKeyword(event.target.value)}
                        placeholder="Cari nama atau SKU sparepart..."
                        aria-label="Cari produk"
                    />

                    <button type="submit" className="button button-primary">
                        Cari
                    </button>

                    <select
                        value={categoryId}
                        onChange={handleCategoryChange}
                        aria-label="Filter kategori"
                        disabled={categoriesLoading}
                    >
                        <option value="">Semua kategori</option>

                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>

                    <select
                        value={sort}
                        onChange={handleSortChange}
                        aria-label="Urutkan produk"
                    >
                        <option value="newest">Terbaru</option>
                        <option value="oldest">Terlama</option>
                        <option value="price_asc">Harga termurah</option>
                        <option value="price_desc">Harga termahal</option>
                        <option value="name_asc">Nama A–Z</option>
                    </select>
                </form>

                {productsLoading && (
                    <div className="page-loading" role="status">
                        Memuat katalog sparepart...
                    </div>
                )}

                {isError && (
                    <div className="error-state" role="alert">
                        <h3>Katalog belum dapat dimuat</h3>
                        <p>
                            {error?.response?.data?.message ||
                                "Periksa apakah server Laravel sedang berjalan."}
                        </p>

                        <button
                            type="button"
                            className="button button-primary"
                            onClick={() => refetch()}
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {!productsLoading && !isError && products.length === 0 && (
                    <div className="empty-state">
                        <h3>Produk belum ditemukan</h3>
                        <p>Coba ubah kata kunci atau filter kategori.</p>
                    </div>
                )}

                {!isError && products.length > 0 && (
                    <>
                        <div className="product-grid">
                            {products.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    product={product}
                                />
                            ))}
                        </div>

                        <nav className="pagination" aria-label="Pagination produk">
                            <button
                                type="button"
                                className="button button-outline"
                                disabled={currentPage <= 1 || productsLoading}
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
                                disabled={currentPage >= lastPage || productsLoading}
                                onClick={() => setPage((current) => current + 1)}
                            >
                                Berikutnya
                            </button>
                        </nav>
                    </>
                )}
            </section>

            <footer className="store-footer">
                <p>
                    © {new Date().getFullYear()} MotoParts.
                    Toko online sparepart motor.
                </p>
                <Link to="/my-orders">Lihat Pesanan Saya</Link>
            </footer>
        </main>
    );
}
