<?php

namespace App\Http\Requests\Product;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $storeId   = $this->user()->store_id;
        $productId = $this->route('product'); // ID dari route parameter

        return [
            'name'        => ['sometimes', 'string', 'max:255'],
            'category_id' => ['nullable', 'uuid', 'exists:categories,id'],
            'sku'         => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products')->where('store_id', $storeId)->ignore($productId),
            ],
            'barcode'     => [
                'nullable',
                'string',
                'max:100',
                Rule::unique('products')->where('store_id', $storeId)->ignore($productId),
            ],
            'description' => ['nullable', 'string'],
            'image'       => ['nullable', 'image', 'max:2048', 'mimes:jpg,jpeg,png,webp'],
            'price'       => ['sometimes', 'numeric', 'min:0'],
            'cost_price'  => ['nullable', 'numeric', 'min:0'],
            'stock'       => ['sometimes', 'integer', 'min:0'],
            'min_stock'   => ['nullable', 'integer', 'min:0'],
            'unit'        => ['nullable', 'string', 'max:30'],
            'track_stock' => ['boolean'],
            'is_active'   => ['boolean'],
        ];
    }
}
