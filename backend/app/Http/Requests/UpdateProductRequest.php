<?php

namespace App\Http\Requests;

use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('admin') ?? false;
    }

    public function rules(): array
    {
        $product = $this->route('product');

        $productId = $product instanceof Product
            ? $product->getKey()
            : $product;

        return [
            'category_id' => [
                'sometimes',
                'required',
                'integer',
                'exists:categories,id',
            ],

            'name' => [
                'sometimes',
                'required',
                'string',
                'max:160',
            ],

            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'max:180',
                Rule::unique('products', 'slug')->ignore($productId),
            ],

            'sku' => [
                'sometimes',
                'required',
                'string',
                'max:80',
                Rule::unique('products', 'sku')->ignore($productId),
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'price' => [
                'sometimes',
                'required',
                'numeric',
                'min:0.01',
                'max:9999999999.99',
            ],

            'stock' => [
                'sometimes',
                'required',
                'integer',
                'min:0',
            ],

            'image' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],

            'is_active' => [
                'sometimes',
                'boolean',
            ],
        ];
    }
}
