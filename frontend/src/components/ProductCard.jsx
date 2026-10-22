import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { useCart } from "../contexts/CartContext";

const currencyFormatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});

export default function ProductCard({ product }) {
    const { addToCart } = useCart();

    if (!product) {
        return null;
    }

    const stock = Number(product.stock ?? 0);
    const isAvailable = product.is_active && stock > 0;

    const handleAddToCart = () => {
        const result = addToCart(product, 1);

        if (result.success) {
            toast.success(result.message);
        } else {
            toast.error(result.message);
        }
    };

    return (
        <article className="product-card">
            <Link
                to={`/product/${product.id}`}
                className="product-card-image-link"
                aria-label={`Lihat detail ${product.name}`}
            >
                {product.image_url ? (
                    <img
                        src={product.image_url}
                        alt={product.name}
                        className="product-card-image"
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="product-card-placeholder"
                        aria-label="Gambar produk belum tersedia"
                    >
                        <span aria-hidden="true">⚙️</span>
                        <span>Sparepart Motor</span>
                    </div>
                )}
            </Link>

            <div className="product-card-body">
                <div className="product-card-meta">
                    <span className="product-category">
                        {product.category?.name || "Sparepart"}
                    </span>

                    <span className="product-sku">
                        SKU: {product.sku}
                    </span>
                </div>

                <h3 className="product-card-title">
                    <Link to={`/product/${product.id}`}>
                        {product.name}
                    </Link>
                </h3>

                <p className="product-card-description">
                    {product.description || "Sparepart motor berkualitas."}
                </p>

                <div className="product-card-price">
                    {currencyFormatter.format(Number(product.price || 0))}
                </div>

                <p
                    className={`product-stock ${stock > 0 ? "stock-available" : "stock-empty"
                        }`}
                >
                    {stock > 0 ? `Stok: ${stock}` : "Stok habis"}
                </p>

                <button
                    type="button"
                    className="button button-primary product-add-button"
                    onClick={handleAddToCart}
                    disabled={!isAvailable}
                >
                    {!product.is_active
                        ? "Produk tidak tersedia"
                        : stock > 0
                            ? "Tambah ke Keranjang"
                            : "Stok Habis"}
                </button>
            </div>
        </article>
    );
}
