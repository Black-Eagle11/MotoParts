import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useCart } from "../contexts/CartContext";

const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
};

export default function CartPage() {
    const {
        cartItems = [],
        cartCount = 0,
        cartSubtotal = 0,
        updateQuantity,
        removeFromCart,
        clearCart,
    } = useCart();

    // Pastikan data keranjang selalu berbentuk array.
    const items = Array.isArray(cartItems) ? cartItems : [];

    const subtotal = Number(cartSubtotal) || 0;
    const totalItems = Number(cartCount) || 0;

    const handleIncrease = (item) => {
        const productId = item.product_id ?? item.id;
        const currentQuantity = Number(item.quantity) || 1;

        if (!productId) {
            toast.error("ID produk tidak ditemukan.");
            return;
        }

        if (
            item.stock !== null &&
            item.stock !== undefined &&
            currentQuantity >= Number(item.stock)
        ) {
            toast.error("Jumlah melebihi stok yang tersedia.");
            return;
        }

        updateQuantity(productId, currentQuantity + 1);
    };

    const handleDecrease = (item) => {
        const productId = item.product_id ?? item.id;
        const currentQuantity = Number(item.quantity) || 1;

        if (!productId) {
            toast.error("ID produk tidak ditemukan.");
            return;
        }

        updateQuantity(productId, currentQuantity - 1);
    };

    const handleRemove = (item) => {
        const productId = item.product_id ?? item.id;

        if (!productId) {
            toast.error("ID produk tidak ditemukan.");
            return;
        }

        removeFromCart(productId);
        toast.success("Produk dihapus dari keranjang.");
    };

    const handleClearCart = () => {
        if (items.length === 0) {
            return;
        }

        const confirmed = window.confirm(
            "Yakin ingin mengosongkan seluruh keranjang?",
        );

        if (!confirmed) {
            return;
        }

        clearCart();
        toast.success("Keranjang berhasil dikosongkan.");
    };

    // Tampilan saat keranjang kosong.
    if (items.length === 0) {
        return (
            <main className="page-container">
                <div className="page-heading">
                    <p className="eyebrow">MotoParts Store</p>
                    <h1>Keranjang Belanja</h1>
                    <p>Produk pilihanmu akan ditampilkan di sini.</p>
                </div>

                <section className="form-section">
                    <div className="empty-state">
                        <p style={{ fontSize: "3rem", marginBottom: "12px" }}>
                            🛒
                        </p>

                        <h2>Keranjangmu masih kosong</h2>

                        <p>
                            Yuk, cari sparepart motor yang kamu butuhkan.
                        </p>

                        <Link to="/" className="button button-primary">
                            Mulai Belanja
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="page-container">
            <header className="page-heading">
                <p className="eyebrow">MotoParts Store</p>
                <h1>Keranjang Belanja</h1>

                <p>
                    Periksa produk dan jumlah barang sebelum melanjutkan
                    ke checkout.
                </p>
            </header>

            <div className="cart-layout">
                <section className="cart-items">
                    {items.map((item, index) => {
                        const productId = item.product_id ?? item.id;

                        const product = item.product ?? item;

                        const productName =
                            product.name ?? item.name ?? "Produk";

                        const productPrice =
                            Number(item.price ?? product.price) || 0;

                        const quantity = Number(item.quantity) || 1;

                        const imageUrl =
                            item.image_url ??
                            product.image_url ??
                            item.imageUrl ??
                            product.imageUrl ??
                            item.image ??
                            product.image ??
                            "";

                        const sku = product.sku ?? item.sku ?? "";
                        const stock = item.stock;

                        const hasStockLimit =
                            stock !== null &&
                            stock !== undefined &&
                            stock !== "";

                        const canIncrease =
                            !hasStockLimit ||
                            quantity < Number(stock);

                        return (
                            <article
                                key={productId ?? `${productName}-${index}`}
                                className="cart-item"
                            >
                                <Link
                                    to={`/product/${productId}`}
                                    className="cart-item-image-wrap"
                                    aria-label={`Lihat ${productName}`}
                                >
                                    {imageUrl ? (
                                        <img
                                            src={imageUrl}
                                            alt={productName}
                                            className="cart-item-image"
                                        />
                                    ) : (
                                        <div className="cart-item-placeholder">
                                            <span>🏍️</span>
                                            <span>Tanpa Gambar</span>
                                        </div>
                                    )}
                                </Link>

                                <div className="cart-item-info">
                                    <Link
                                        to={`/product/${productId}`}
                                        className="cart-item-title"
                                    >
                                        {productName}
                                    </Link>

                                    {sku && (
                                        <p className="cart-item-sku">
                                            SKU: {sku}
                                        </p>
                                    )}

                                    <p className="cart-item-price">
                                        {formatCurrency(productPrice)} / barang
                                    </p>

                                    {hasStockLimit && (
                                        <p className="cart-item-sku">
                                            Stok tersedia: {Number(stock)}
                                        </p>
                                    )}

                                    <div className="cart-item-bottom">
                                        <div
                                            className="quantity-control"
                                            style={{ marginTop: 0 }}
                                        >
                                            <label>
                                                Jumlah
                                            </label>

                                            <div className="quantity-input-group">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDecrease(item)}
                                                    aria-label={`Kurangi ${productName}`}
                                                    title="Kurangi jumlah"
                                                >
                                                    −
                                                </button>

                                                <span
                                                    className="quantity-value"
                                                    aria-live="polite"
                                                >
                                                    {quantity}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() => handleIncrease(item)}
                                                    disabled={!canIncrease}
                                                    aria-label={`Tambah ${productName}`}
                                                    title={
                                                        canIncrease
                                                            ? "Tambah jumlah"
                                                            : "Stok maksimum tercapai"
                                                    }
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            className="text-button text-danger"
                                            onClick={() => handleRemove(item)}
                                        >
                                            Hapus
                                        </button>
                                    </div>
                                </div>

                                <div className="cart-item-total">
                                    {formatCurrency(productPrice * quantity)}
                                </div>
                            </article>
                        );
                    })}

                    <div
                        style={{
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            gap: "12px",
                            alignItems: "center",
                        }}
                    >
                        <Link to="/" className="back-link">
                            ← Lanjut Belanja
                        </Link>

                        <button
                            type="button"
                            className="text-button text-danger"
                            onClick={handleClearCart}
                        >
                            Kosongkan Keranjang
                        </button>
                    </div>
                </section>

                <aside className="cart-summary">
                    <h2>Ringkasan Belanja</h2>

                    <div className="summary-row">
                        <span>Jenis produk</span>
                        <span>{items.length}</span>
                    </div>

                    <div className="summary-row">
                        <span>Total barang</span>
                        <span>{totalItems}</span>
                    </div>

                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                    </div>

                    <div className="summary-row">
                        <span>Pengiriman</span>
                        <span>Dihitung saat checkout</span>
                    </div>

                    <div className="summary-total">
                        <span>Total sementara</span>
                        <strong>{formatCurrency(subtotal)}</strong>
                    </div>

                    <p className="summary-note">
                        Total akhir dan ketersediaan stok akan diverifikasi
                        kembali oleh server saat pesanan dibuat.
                    </p>

                    <Link
                        to="/checkout"
                        className="button button-primary checkout-button"
                    >
                        Lanjut ke Checkout
                    </Link>

                    <Link to="/" className="back-link">
                        ← Kembali ke Toko
                    </Link>
                </aside>
            </div>
        </main>
    );
}
