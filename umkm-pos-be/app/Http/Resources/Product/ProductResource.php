<?php

namespace App\Http\Resources\Product;

use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'name'        => $this->name,
            'sku'         => $this->sku,
            'barcode'     => $this->barcode,
            'description' => $this->description,
            'image'       => $this->image
                ? asset('storage/' . $this->image)
                : null,
            'price'       => (float) $this->price,
            'cost_price'  => (float) $this->cost_price,
            'margin'      => $this->margin, // computed attribute
            'stock'       => $this->stock,
            'min_stock'   => $this->min_stock,
            'unit'        => $this->unit,
            'track_stock' => $this->track_stock,
            'is_active'   => $this->is_active,
            'is_low_stock' => $this->track_stock && $this->stock <= $this->min_stock,
            'category'    => $this->whenLoaded('category', fn() => [
                'id'   => $this->category->id,
                'name' => $this->category->name,
            ]),
            'created_at'  => $this->created_at->format('Y-m-d H:i:s'),
            'updated_at'  => $this->updated_at->format('Y-m-d H:i:s'),
        ];
    }
}
