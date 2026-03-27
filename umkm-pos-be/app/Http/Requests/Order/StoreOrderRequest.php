<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Item wajib ada minimal satu
            'items'                  => ['required', 'array', 'min:1'],
            'items.*.product_id'     => ['required', 'uuid'],
            'items.*.quantity'       => ['required', 'integer', 'min:1'],

            // Pembayaran
            'payment_method'         => ['required', 'string', 'in:cash,qris,card,transfer,mixed'],
            'amount_paid'            => ['required', 'numeric', 'min:0'],
            'payment_metadata'       => ['nullable', 'array'],

            // Opsional
            'customer_id'            => ['nullable', 'uuid', 'exists:customers,id'],
            'shift_id'               => ['nullable', 'uuid', 'exists:shifts,id'],
            'discount_code'          => ['nullable', 'string', 'max:50'],
            'tax_percentage'         => ['nullable', 'numeric', 'min:0', 'max:100'],
            'notes'                  => ['nullable', 'string', 'max:500'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required'             => 'Minimal 1 produk harus ditambahkan.',
            'items.*.product_id.required' => 'ID produk wajib ada.',
            'items.*.quantity.min'        => 'Jumlah minimal 1.',
            'payment_method.in'           => 'Metode pembayaran tidak valid.',
            'amount_paid.required'        => 'Jumlah bayar wajib diisi.',
        ];
    }
}
