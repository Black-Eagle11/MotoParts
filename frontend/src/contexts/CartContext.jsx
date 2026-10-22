/* eslint-disable react-refresh/only-export-components */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "motoparts_cart";

function toNonNegativeNumber(value, fallback = 0) {
    const number = Number(value);

    if (!Number.isFinite(number) || number < 0) {
        return fallback;
    }

    return number;
}

function normalizeCartItem(source) {
    if (!source || typeof source !== "object") {
        return null;
    }

    const originalProduct =
        source.product &&
            typeof source.product === "object"
            ? source.product
            : source;

    const productId =
        originalProduct.id ??
        originalProduct.product_id ??
        source.product_id ??
        source.id;

    if (
        productId === undefined ||
        productId === null ||
        String(productId).trim() === ""
    ) {
        return null;
    }

    const rawPrice =
        originalProduct.price ?? source.price ?? 0;

    const price = toNonNegativeNumber(rawPrice);

    const rawStock =
        originalProduct.stock ?? source.stock;

    let stock = null;

    if (
        rawStock !== undefined &&
        rawStock !== null &&
        rawStock !== ""
    ) {
        const parsedStock = Number(rawStock);

        if (
            Number.isInteger(parsedStock) &&
            parsedStock >= 0
        ) {
            stock = parsedStock;
        }
    }

    const rawQuantity = Number(source.quantity ?? 1);

    const quantity =
        Number.isInteger(rawQuantity) &&
            rawQuantity > 0
            ? rawQuantity
            : 1;

    const product = {
        ...originalProduct,
        id: productId,
        price,
    };

    return {
        ...source,
        ...product,
        id: productId,
        product_id: productId,
        product,
        price,
        stock,
        quantity,
    };
}

function readSavedCart() {
    try {
        if (typeof window === "undefined") {
            return [];
        }

        const savedCart = localStorage.getItem(CART_STORAGE_KEY);

        if (!savedCart) {
            return [];
        }

        const parsedCart = JSON.parse(savedCart);

        if (!Array.isArray(parsedCart)) {
            return [];
        }

        return parsedCart
            .map((item) => normalizeCartItem(item))
            .filter(Boolean);
    } catch (error) {
        console.error(
            "Gagal membaca keranjang dari penyimpanan lokal:",
            error,
        );

        return [];
    }
}

function persistCart(cartItems) {
    try {
        if (typeof window === "undefined") {
            return;
        }

        localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(cartItems),
        );
    } catch (error) {
        console.error(
            "Gagal menyimpan keranjang:",
            error,
        );
    }
}

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(readSavedCart);

    useEffect(() => {
        persistCart(cartItems);
    }, [cartItems]);

    const addToCart = useCallback((product, quantity = 1) => {
        const normalizedProduct = normalizeCartItem({
            ...product,
            quantity: 1,
        });

        if (!normalizedProduct) {
            console.error(
                "Produk tidak memiliki ID yang valid.",
            );

            return false;
        }

        const requestedQuantity = Number(quantity);

        const amountToAdd =
            Number.isInteger(requestedQuantity) &&
                requestedQuantity > 0
                ? requestedQuantity
                : 1;

        if (
            normalizedProduct.stock !== null &&
            normalizedProduct.stock < 1
        ) {
            return false;
        }

        setCartItems((currentItems) => {
            const existingItem = currentItems.find(
                (item) =>
                    String(item.product_id ?? item.id) ===
                    String(normalizedProduct.product_id),
            );

            if (existingItem) {
                const requestedTotal =
                    existingItem.quantity + amountToAdd;

                const nextQuantity =
                    normalizedProduct.stock === null
                        ? requestedTotal
                        : Math.min(
                            requestedTotal,
                            normalizedProduct.stock,
                        );

                if (nextQuantity === existingItem.quantity) {
                    return currentItems;
                }

                return currentItems.map((item) =>
                    String(item.product_id ?? item.id) ===
                        String(normalizedProduct.product_id)
                        ? {
                            ...item,
                            ...normalizedProduct,
                            quantity: nextQuantity,
                        }
                        : item,
                );
            }

            const initialQuantity =
                normalizedProduct.stock === null
                    ? amountToAdd
                    : Math.min(
                        amountToAdd,
                        normalizedProduct.stock,
                    );

            return [
                ...currentItems,
                {
                    ...normalizedProduct,
                    quantity: initialQuantity,
                },
            ];
        });

        return true;
    }, []);

    const updateQuantity = useCallback(
        (productId, quantity) => {
            const requestedQuantity = Number(quantity);

            setCartItems((currentItems) => {
                const targetItem = currentItems.find(
                    (item) =>
                        String(item.product_id ?? item.id) ===
                        String(productId),
                );

                if (!targetItem) {
                    return currentItems;
                }

                if (
                    !Number.isFinite(requestedQuantity) ||
                    requestedQuantity <= 0
                ) {
                    return currentItems.filter(
                        (item) =>
                            String(item.product_id ?? item.id) !==
                            String(productId),
                    );
                }

                const nextQuantity = Math.floor(requestedQuantity);

                if (nextQuantity < 1) {
                    return currentItems.filter(
                        (item) =>
                            String(item.product_id ?? item.id) !==
                            String(productId),
                    );
                }

                const safeQuantity =
                    targetItem.stock === null
                        ? nextQuantity
                        : Math.min(nextQuantity, targetItem.stock);

                if (safeQuantity === targetItem.quantity) {
                    return currentItems;
                }

                return currentItems.map((item) =>
                    String(item.product_id ?? item.id) ===
                        String(productId)
                        ? {
                            ...item,
                            quantity: safeQuantity,
                        }
                        : item,
                );
            });
        },
        [],
    );

    const removeFromCart = useCallback((productId) => {
        setCartItems((currentItems) =>
            currentItems.filter(
                (item) =>
                    String(item.product_id ?? item.id) !==
                    String(productId),
            ),
        );
    }, []);

    const clearCart = useCallback(() => {
        setCartItems([]);
    }, []);

    const cartCount = useMemo(() => {
        return cartItems.reduce(
            (count, item) =>
                count + Math.max(0, Number(item.quantity) || 0),
            0,
        );
    }, [cartItems]);

    const cartSubtotal = useMemo(() => {
        const totalInCents = cartItems.reduce(
            (total, item) => {
                const price = toNonNegativeNumber(item.price);
                const quantity = Math.max(
                    0,
                    Number(item.quantity) || 0,
                );

                const priceInCents = Math.round(price * 100);

                return total + priceInCents * quantity;
            },
            0,
        );

        return totalInCents / 100;
    }, [cartItems]);

    const checkoutItems = useMemo(() => {
        return cartItems.map((item) => ({
            product_id: Number(item.product_id ?? item.id),
            quantity: Number(item.quantity),
        }));
    }, [cartItems]);

    const contextValue = useMemo(
        () => ({
            cartItems,
            items: cartItems,
            cartCount,
            cartSubtotal,
            subtotal: cartSubtotal,
            checkoutItems,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
        }),
        [
            cartItems,
            cartCount,
            cartSubtotal,
            checkoutItems,
            addToCart,
            updateQuantity,
            removeFromCart,
            clearCart,
        ],
    );

    return (
        <CartContext.Provider value={contextValue}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart harus digunakan di dalam CartProvider.",
        );
    }

    return context;
}
