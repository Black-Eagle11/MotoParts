import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import api from "../../lib/api";

const formatCurrency = (amount) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);

const getResponseRecord = (responseData) =>
    responseData?.data ?? responseData;

const getResponseCollection = (responseData) => {
    const payload = responseData?.data ?? responseData;
    return Array.isArray(payload) ? payload : [];
};

const getCategoryId = (category) =>
    category?.id ?? category?.category_id;

const getCategoryName = (category) =>
    category?.name ?? category?.category ?? "Kategori";

const getErrorMessage = (errors, field) => {
    const error = errors?.[field];

    if (Array.isArray(error) && error.length > 0) {
        return error[0];
    }

    return typeof error === "string" ? error : "";
};

const getApiErrorMessage = (error) => {
    const status = error.response?.status;
    const responseMessage = error.response?.data?.message;

    if (status === 401) {
        return "Sesi login berakhir. Silakan login kembali.";
    }

    if (status === 403) {
        return "Akses ditolak. Hanya admin yang dapat mengelola produk.";
    }

    if (status === 404) {
        return "Produk atau kategori tidak ditemukan.";
    }

    if (status === 422) {
        return responseMessage ?? "Periksa kembali data produk.";
    }

    return responseMessage ?? "Terjadi kesalahan. Silakan coba kembali.";
};

function LoadingState({ message = "Memuat data..." }) {
    return (
        <main className="page-container">
            <div className="loading-state" role="status">
                {message}
            </div>
        </main>
    );
}

function ErrorState({ message }) {
    return (
        <main className="page-container">
            <section className="empty-state">
                <h1>Data gagal dimuat</h1>
                <p>{message}</p>

                <Link to="/admin" className="btn btn-secondary">
                    Kembali ke Dashboard
                </Link>
            </section>
        </main>
    );
}

function ProductEditorForm({
    product,
    categories,
    isEditing,
}) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [formData, setFormData] = useState(() => ({
        name: product?.name ?? "",
        category_id:
            product?.category_id != null
                ? String(product.category_id)
                : categories.length > 0
                    ? String(getCategoryId(categories[0]) ?? "")
                    : "",
        price:
            product?.price != null
                ? String(product.price)
                : "",
        stock:
            product?.stock != null
                ? String(product.stock)
                : "0",
        description: product?.description ?? "",
        is_active:
            product?.is_active === undefined ||
                product?.is_active === null
                ? true
                : [
                    true,
                    1,
                    "1",
                ].includes(product.is_active),
    }));

    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(
        product?.image_url ?? "",
    );
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Bersihkan URL preview gambar lokal saat URL tersebut tidak dipakai lagi.
    useEffect(() => {
        return () => {
            if (
                typeof imagePreview === "string" &&
                imagePreview.startsWith("blob:")
            ) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const handleChange = (event) => {
        const { name, value, checked, type } = event.target;

        setFormData((previous) => ({
            ...previous,
            [name]: type === "checkbox" ? checked : value,
        }));

        setErrors((previous) => {
            if (!previous[name]) {
                return previous;
            }

            const nextErrors = { ...previous };
            delete nextErrors[name];

            return nextErrors;
        });
    };

    const handleImageChange = (event) => {
        const selectedFile = event.target.files?.[0] ?? null;

        if (!selectedFile) {
            return;
        }

        if (!selectedFile.type.startsWith("image/")) {
            toast.error("File harus berupa gambar.");
            event.target.value = "";
            return;
        }

        setImageFile(selectedFile);
        setImagePreview(URL.createObjectURL(selectedFile));

        setErrors((previous) => {
            const nextErrors = { ...previous };
            delete nextErrors.image;
            delete nextErrors.image_path;

            return nextErrors;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrors({});

        if (!formData.name.trim()) {
            setErrors({ name: ["Nama produk wajib diisi."] });
            toast.error("Nama produk wajib diisi.");
            return;
        }

        if (!formData.category_id) {
            setErrors({
                category_id: ["Silakan pilih kategori produk."],
            });
            toast.error("Kategori produk wajib dipilih.");
            return;
        }

        if (
            formData.price === "" ||
            !Number.isFinite(Number(formData.price)) ||
            Number(formData.price) < 0
        ) {
            setErrors({
                price: ["Harga harus berupa angka nol atau lebih."],
            });
            toast.error("Masukkan harga produk yang valid.");
            return;
        }

        if (
            formData.stock === "" ||
            !Number.isInteger(Number(formData.stock)) ||
            Number(formData.stock) < 0
        ) {
            setErrors({
                stock: ["Stok harus berupa bilangan bulat nol atau lebih."],
            });
            toast.error("Masukkan stok produk yang valid.");
            return;
        }

        if (imageFile && imageFile.size > 5 * 1024 * 1024) {
            setErrors({
                image: ["Ukuran gambar maksimal 5 MB."],
            });
            toast.error("Ukuran gambar maksimal 5 MB.");
            return;
        }

        const payload = new FormData();

        payload.append("name", formData.name.trim());
        payload.append("category_id", formData.category_id);
        payload.append("price", String(Number(formData.price)));
        payload.append("stock", String(Number(formData.stock)));
        payload.append("description", formData.description.trim());
        payload.append("is_active", formData.is_active ? "1" : "0");

        if (imageFile) {
            payload.append("image", imageFile);
        }

        if (isEditing) {
            // Laravel method spoofing untuk update dengan multipart/form-data.
            payload.append("_method", "PUT");
        }

        setIsSubmitting(true);

        try {
            let response;

            if (isEditing) {
                response = await api.post(
                    `/products/${product.id}`,
                    payload,
                );
            } else {
                response = await api.post("/products", payload);
            }

            await queryClient.invalidateQueries({
                queryKey: ["products"],
            });

            await queryClient.invalidateQueries({
                queryKey: ["product", String(product?.id ?? "")],
            });

            await queryClient.invalidateQueries({
                queryKey: ["admin-product", String(product?.id ?? "")],
            });

            const savedProduct = getResponseRecord(response.data);

            toast.success(
                isEditing
                    ? "Produk berhasil diperbarui!"
                    : "Produk berhasil ditambahkan!",
            );

            navigate("/admin", {
                replace: true,
                state: {
                    savedProduct,
                },
            });
        } catch (error) {
            const validationErrors = error.response?.data?.errors;

            if (
                error.response?.status === 422 &&
                validationErrors
            ) {
                setErrors(validationErrors);
            }

            toast.error(getApiErrorMessage(error));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="page-container admin-product-form-page">
            <header className="page-header">
                <div>
                    <p className="eyebrow">MotoParts Admin</p>
                    <h1>{isEditing ? "Edit Produk" : "Tambah Produk"}</h1>
                    <p>
                        {isEditing
                            ? "Perbarui informasi produk yang tersimpan."
                            : "Masukkan informasi produk baru ke katalog MotoParts."}
                    </p>
                </div>

                <Link to="/admin" className="btn btn-secondary">
                    Kembali
                </Link>
            </header>

            <section className="form-card admin-product-form-card">
                <form onSubmit={handleSubmit} noValidate>
                    <div className="form-field">
                        <label htmlFor="name">Nama produk</label>
                        <input
                            id="name"
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Contoh: Kampas Rem Depan"
                            required
                            maxLength={255}
                            aria-invalid={Boolean(errors.name)}
                        />

                        {getErrorMessage(errors, "name") && (
                            <p className="form-error">
                                {getErrorMessage(errors, "name")}
                            </p>
                        )}
                    </div>

                    <div className="form-field">
                        <label htmlFor="category_id">Kategori</label>

                        <select
                            id="category_id"
                            name="category_id"
                            value={formData.category_id}
                            onChange={handleChange}
                            required
                            disabled={categories.length === 0}
                            aria-invalid={Boolean(errors.category_id)}
                        >
                            <option value="">Pilih kategori</option>

                            {categories.map((category) => {
                                const categoryId = getCategoryId(category);

                                return (
                                    <option
                                        key={categoryId}
                                        value={String(categoryId)}
                                    >
                                        {getCategoryName(category)}
                                    </option>
                                );
                            })}
                        </select>

                        {categories.length === 0 && (
                            <p className="form-hint">
                                Belum ada kategori tersedia. Tambahkan kategori terlebih dahulu.
                            </p>
                        )}

                        {getErrorMessage(errors, "category_id") && (
                            <p className="form-error">
                                {getErrorMessage(errors, "category_id")}
                            </p>
                        )}
                    </div>

                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="price">Harga (Rp)</label>
                            <input
                                id="price"
                                name="price"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
                                value={formData.price}
                                onChange={handleChange}
                                placeholder="150000"
                                required
                                aria-invalid={Boolean(errors.price)}
                            />

                            {getErrorMessage(errors, "price") && (
                                <p className="form-error">
                                    {getErrorMessage(errors, "price")}
                                </p>
                            )}

                            {formData.price !== "" &&
                                Number.isFinite(Number(formData.price)) &&
                                Number(formData.price) >= 0 && (
                                    <p className="form-hint">
                                        {formatCurrency(formData.price)}
                                    </p>
                                )}
                        </div>

                        <div className="form-field">
                            <label htmlFor="stock">Stok</label>
                            <input
                                id="stock"
                                name="stock"
                                type="number"
                                inputMode="numeric"
                                min="0"
                                step="1"
                                value={formData.stock}
                                onChange={handleChange}
                                required
                                aria-invalid={Boolean(errors.stock)}
                            />

                            {getErrorMessage(errors, "stock") && (
                                <p className="form-error">
                                    {getErrorMessage(errors, "stock")}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="form-field">
                        <label htmlFor="description">Deskripsi produk</label>
                        <textarea
                            id="description"
                            name="description"
                            rows={5}
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Jelaskan fungsi, spesifikasi, dan kecocokan produk..."
                            maxLength={5000}
                            aria-invalid={Boolean(errors.description)}
                        />

                        {getErrorMessage(errors, "description") && (
                            <p className="form-error">
                                {getErrorMessage(errors, "description")}
                            </p>
                        )}
                    </div>

                    <div className="form-field">
                        <label htmlFor="image">Gambar produk</label>
                        <input
                            id="image"
                            name="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            aria-invalid={Boolean(
                                errors.image || errors.image_path,
                            )}
                        />

                        <p className="form-hint">
                            Gunakan file gambar maksimal 5 MB. Saat mengedit,
                            gambar lama tetap dipakai jika tidak memilih gambar baru.
                        </p>

                        {getErrorMessage(errors, "image") && (
                            <p className="form-error">
                                {getErrorMessage(errors, "image")}
                            </p>
                        )}

                        {getErrorMessage(errors, "image_path") && (
                            <p className="form-error">
                                {getErrorMessage(errors, "image_path")}
                            </p>
                        )}

                        {imagePreview && (
                            <div className="product-image-preview">
                                <p>Pratinjau gambar</p>
                                <img
                                    src={imagePreview}
                                    alt={`Pratinjau ${formData.name || "produk"}`}
                                    className="product-preview-image"
                                />
                            </div>
                        )}
                    </div>

                    <div className="checkbox-row">
                        <input
                            id="is_active"
                            name="is_active"
                            type="checkbox"
                            checked={formData.is_active}
                            onChange={handleChange}
                        />

                        <label htmlFor="is_active">
                            Produk aktif dan dapat ditampilkan di katalog
                        </label>
                    </div>

                    {getErrorMessage(errors, "is_active") && (
                        <p className="form-error">
                            {getErrorMessage(errors, "is_active")}
                        </p>
                    )}

                    <div className="form-actions">
                        <Link
                            to="/admin"
                            className="btn btn-secondary"
                            aria-disabled={isSubmitting}
                        >
                            Batal
                        </Link>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                                isSubmitting || categories.length === 0
                            }
                        >
                            {isSubmitting
                                ? "Menyimpan..."
                                : isEditing
                                    ? "Simpan Perubahan"
                                    : "Tambah Produk"}
                        </button>
                    </div>
                </form>
            </section>
        </main>
    );
}

export default function ProductForm() {
    const { id } = useParams();
    const isEditing = Boolean(id);

    const categoriesQuery = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const response = await api.get("/categories");
            return getResponseCollection(response.data);
        },
    });

    const productQuery = useQuery({
        queryKey: ["admin-product", String(id ?? "")],
        queryFn: async () => {
            const response = await api.get(`/products/${id}`);
            return getResponseRecord(response.data);
        },
        enabled: isEditing,
        retry: false,
    });

    if (
        categoriesQuery.isLoading ||
        (isEditing && productQuery.isLoading)
    ) {
        return (
            <LoadingState message="Memuat data produk dan kategori..." />
        );
    }

    if (categoriesQuery.isError) {
        return (
            <ErrorState message={getApiErrorMessage(categoriesQuery.error)} />
        );
    }

    if (isEditing && productQuery.isError) {
        return (
            <ErrorState message={getApiErrorMessage(productQuery.error)} />
        );
    }

    const categories = categoriesQuery.data ?? [];
    const product = isEditing ? productQuery.data : null;

    if (isEditing && !product) {
        return (
            <ErrorState message="Data produk tidak ditemukan." />
        );
    }

    return (
        <ProductEditorForm
            key={isEditing ? `edit-${id}` : "create-product"}
            product={product}
            categories={categories}
            isEditing={isEditing}
        />
    );
}
