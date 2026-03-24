<?php

namespace App\Http\Resources\Order;

use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'             => $this->id,
            'order_number'   => $this->order_number,
            'status'         => $this->status,
            'subtotal'       => (float) $this->subtotal,
            'discount_amount' => (float) $this->discount_amount,
            'tax_percentage' => (float) $this->tax_percentage,
            'tax_amount'     => (float) $this->tax_amount,
            'total'          => (float) $this->total,
            'payment_method' => $this->payment_method,
            'amount_paid'    => (float) $this->amount_paid,
            'change_amount'  => (float) $this->change_amount,
            'notes'          => $this->notes,
            'cancel_reason'  => $this->cancel_reason,
            'cashier'        => $this->whenLoaded('user', fn() => [
                'id'   => $this->user->id,
                'name' => $this->user->name,
            ]),
            'customer'       => $this->whenLoaded('customer', fn() => $this->customer ? [
                'id'    => $this->customer->id,
                'name'  => $this->customer->name,
                'phone' => $this->customer->phone,
            ] : null),
            'items'          => $this->whenLoaded(
                'items',
                fn() =>
                $this->items->map(fn($item) => [
                    'id'           => $item->id,
                    'product_id'   => $item->product_id,
                    'product_name' => $item->product_name,
                    'product_sku'  => $item->product_sku,
                    'price'        => (float) $item->price,
                    'quantity'     => $item->quantity,
                    'discount'     => (float) $item->discount_amount,
                    'subtotal'     => (float) $item->subtotal,
                ])
            ),
            'discounts'      => $this->whenLoaded(
                'discounts',
                fn() =>
                $this->discounts->map(fn($d) => [
                    'name'   => $d->discount_name,
                    'code'   => $d->discount_code,
                    'amount' => (float) $d->discount_amount,
                ])
            ),
            'payments'       => $this->whenLoaded(
                'payments',
                fn() =>
                $this->payments->map(fn($p) => [
                    'method'    => $p->method,
                    'amount'    => (float) $p->amount,
                    'status'    => $p->status,
                    'reference' => $p->reference,
                    'paid_at'   => $p->paid_at?->format('Y-m-d H:i:s'),
                ])
            ),
            'created_at'     => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
