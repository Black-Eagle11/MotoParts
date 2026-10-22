import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../lib/api";
import { useCart } from "../contexts/CartContext";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

export default function ProductDetailPage() {
    const { id } = useParams();
    const { addToCart } = useCart();
    const [quantity, setQuantity] = useState(1);

    const {
        data: product,
        isLoading,
        isError,
        error,
    } = useQuery({
        queryKey: ["product", id],
        queryFn: async () => {
            const response = await api.get(`/products/${id}`);
            return response.data.data;
        },
        enabled: Boolean(id),
    });

    if (isLoading) {
        return (
            <main className="page-container">
                <div className="page-loading" role="status">
                    Memuat detail produk...
                </div>
            </main>
        );
    }

    if (isError || !product) {
        return (
            <main className="page-container">
                <div className="error-state" role="alert">
                    <h2>Produk tidak ditemukan</h2>
                    <p>
                        {error?.response?.data?.message ||
                            "Produk mungkin sudah tidak tersedia."}
                    </p>
                    <Link to="/" className="button button-primary">
                        Kembali ke Katalog
                    </Link>
                </div>
            </main>
        );
    }

    const stock = Number(product.stock ?? 0);
    const isAvailable = product.is_active && stock > 0;

    const handleAddToCart = () => {
        const result = addToCart(product, quantity);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <main className="page-container product-detail-page">
            <nav className="breadcrumbs" aria-label="Breadcrumb">
                <Link to="/">Beranda</Link>
                <span>/</span>
                <span>{product.name}</span>
            </nav>

            <section className="product-detail-layout">
                <div className="product-detail-image-wrap">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="product-detail-image"
                        />
                    ) : (
                        <div className="product-detail-placeholder">
                            <span aria-hidden="true">⚙️</span>
                            <p>Foto produk belum tersedia</p>
                        </div>
                    )}
                </div>

                <div className="product-detail-info">
                    <p className="eyebrow">
                        {product.category?.name || "Sparepart Motor"}
                    </p>

                    <h1>{product.name}</h1>

                    <p className="product-detail-sku">
                        SKU: {product.sku}
                    </p>

                    <p className="product-detail-price">
                        {currencyFormatter.format(Number(product.price || 0))}
                    </p>

                    <p
                        className={`product-stock ${stock > 0 ? "stock-available" : "stock-empty"
                            }`}
                    >
                        {stock > 0 ? `Tersedia ${stock} unit` : "Stok habis"}
                    </p>

                    <div className="product-detail-description">
                        <h2>Deskripsi Produk</h2>
                        <p>
                            {product.description ||
                                "Belum ada deskripsi untuk produk ini."}
                        </p>
                    </div>

                    {isAvailable && (
                        <div className="quantity-control">
                            <label htmlFor="quantity">Jumlah</label>

                            <div className="quantity-input-group">
                                <button
                                    type="button"
                                    aria-label="Kurangi jumlah"
                                    disabled={quantity <= 1}
                                    onClick={() =>
                                        setQuantity((current) => Math.max(1, current - 1))
                                    }
                                >
                                    −
                                </button>

                                <input
                                    id="quantity"
                                    type="number"
                                    min="1"
                                    max={stock}
                                    value={quantity}
                                    onChange={(event) => {
                                        const value = Number(event.target.value);

                                        if (Number.isInteger(value) && value >= 1) {
                                            setQuantity(Math.min(value, stock));
                                        }
                                    }}
                                />

                                <button
                                    type="button"
                                    aria-label="Tambah jumlah"
                                    disabled={quantity >= stock}
                                    onClick={() =>
                                        setQuantity((current) =>
                                            Math.min(stock, current + 1)
                                        )
                                    }
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="button button-primary product-detail-add"
                        onClick={handleAddToCart}
                        disabled={!isAvailable}
                    >
                        {isAvailable ? "Tambah ke Keranjang" : "Produk Tidak Tersedia"}
                    </button>

                    <Link to="/" className="back-link">
                        ← Kembali ke katalog
                    </Link>
                </div>
            </section>
        </main>
    );
}
