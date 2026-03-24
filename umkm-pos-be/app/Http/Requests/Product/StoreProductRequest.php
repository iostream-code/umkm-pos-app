<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId = $this->user()->store_id;

        return [
            'name'        => ['required', 'string', 'max:255'],
            'category_id' => ['nullable', 'uuid', 'exists:categories,id'],
            'sku'         => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products')->where('store_id', $storeId),
            ],
            'barcode'     => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products')->where('store_id', $storeId),
            ],
            'description' => ['nullable', 'string'],
            'image'       => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
            'price'       => ['required', 'numeric', 'min:0'],
            'cost_price'  => ['nullable', 'numeric', 'min:0'],
            'stock'       => ['required', 'integer', 'min:0'],
            'min_stock'   => ['nullable', 'integer', 'min:0'],
            'unit'        => ['nullable', 'string', 'max:30'],
            'track_stock' => ['boolean'],
            'is_active'   => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'   => 'Nama produk wajib diisi.',
            'price.required'  => 'Harga jual wajib diisi.',
            'price.numeric'   => 'Harga harus berupa angka.',
            'stock.required'  => 'Stok awal wajib diisi.',
            'sku.unique'      => 'SKU sudah digunakan produk lain.',
            'barcode.unique'  => 'Barcode sudah digunakan produk lain.',
            'image.max'       => 'Ukuran gambar maksimal 2MB.',
        ];
    }
}
