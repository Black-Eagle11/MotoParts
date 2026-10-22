<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{

    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $customerName = $this->firstNonEmptyInput([
            'customer_name',
            'name',
            'recipient_name',
            'shipping_name',
            'receiver_name',
        ]);

        $customerPhone = $this->firstNonEmptyInput([
            'customer_phone',
            'phone_number',
            'phone',
            'shipping_phone',
            'recipient_phone',
        ]);

        $shippingAddress = $this->firstNonEmptyInput([
            'shipping_address',
            'address',
            'recipient_address',
        ]);

        /*
         * Checkout saat ini belum menyediakan pilihan metode
         * pembayaran, sehingga gunakan COD sebagai default.
         * Jika metode dikirim oleh frontend, nilainya tetap
         * akan diperiksa oleh rules().
         */
        $paymentMethod = $this->firstNonEmptyInput([
            'payment_method',
        ]) ?? 'cod';

        $this->merge([
            'customer_name' => $customerName,
            'customer_phone' => $customerPhone,
            'shipping_address' => $shippingAddress,
            'payment_method' => $paymentMethod,
        ]);
    }

    private function firstNonEmptyInput(array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $this->input($key);

            if (! is_scalar($value)) {
                continue;
            }

            $value = trim((string) $value);

            if ($value !== '') {
                return $value;
            }
        }

        return null;
    }

    public function rules(): array
    {
        return [
            'customer_name' => [
                'required',
                'string',
                'max:120',
            ],

            'customer_phone' => [
                'required',
                'string',
                'max:30',
            ],

            'shipping_address' => [
                'required',
                'string',
                'max:2000',
            ],

            'payment_method' => [
                'required',
                Rule::in([
                    'cod',
                    'bank_transfer',
                ]),
            ],

            'items' => [
                'required',
                'array',
                'min:1',
                'max:50',
            ],

            'items.*.product_id' => [
                'required',
                'integer',
                'distinct',
                'exists:products,id',
            ],

            'items.*.quantity' => [
                'required',
                'integer',
                'min:1',
                'max:1000',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_name.required' =>
                'Nama penerima wajib diisi.',

            'customer_name.string' =>
                'Nama penerima harus berupa teks.',

            'customer_name.max' =>
                'Nama penerima maksimal 120 karakter.',

            'customer_phone.required' =>
                'Nomor telepon wajib diisi.',

            'customer_phone.string' =>
                'Nomor telepon harus berupa teks.',

            'customer_phone.max' =>
                'Nomor telepon maksimal 30 karakter.',

            'shipping_address.required' =>
                'Alamat pengiriman wajib diisi.',

            'shipping_address.string' =>
                'Alamat pengiriman harus berupa teks.',

            'shipping_address.max' =>
                'Alamat pengiriman maksimal 2000 karakter.',

            'payment_method.required' =>
                'Metode pembayaran wajib dipilih.',

            'payment_method.in' =>
                'Metode pembayaran tidak valid.',

            'items.required' =>
                'Keranjang belanja masih kosong.',

            'items.array' =>
                'Format daftar produk tidak valid.',

            'items.min' =>
                'Pesanan harus memiliki setidaknya satu produk.',

            'items.max' =>
                'Pesanan maksimal berisi 50 jenis produk.',

            'items.*.product_id.required' =>
                'ID produk wajib diisi.',

            'items.*.product_id.integer' =>
                'ID produk tidak valid.',

            'items.*.product_id.distinct' =>
                'Produk yang sama tidak boleh diulang dalam daftar item.',

            'items.*.product_id.exists' =>
                'Produk yang dipilih tidak ditemukan.',

            'items.*.quantity.required' =>
                'Jumlah setiap produk wajib diisi.',

            'items.*.quantity.integer' =>
                'Jumlah produk harus berupa bilangan bulat.',

            'items.*.quantity.min' =>
                'Jumlah produk minimal satu.',

            'items.*.quantity.max' =>
                'Jumlah produk maksimal 1000.',
        ];
    }

    public function attributes(): array
    {
        return [
            'customer_name' => 'nama penerima',
            'customer_phone' => 'nomor telepon',
            'shipping_address' => 'alamat pengiriman',
            'payment_method' => 'metode pembayaran',
            'items' => 'daftar produk',
            'items.*.product_id' => 'produk',
            'items.*.quantity' => 'jumlah produk',
        ];
    }
}
