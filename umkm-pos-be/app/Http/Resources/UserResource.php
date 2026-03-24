<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'            => $this->id,
            'name'          => $this->name,
            'email'         => $this->email,
            'phone'         => $this->phone,
            'role'          => $this->role,
            'avatar'        => $this->avatar
                ? asset('storage/' . $this->avatar)
                : null,
            'is_active'     => $this->is_active,
            'last_login_at' => $this->last_login_at?->diffForHumans(),
            'store'         => $this->whenLoaded('store', fn() => [
                'id'       => $this->store->id,
                'name'     => $this->store->name,
                'currency' => $this->store->currency,
                'timezone' => $this->store->timezone,
            ]),
            'created_at'    => $this->created_at->format('Y-m-d H:i:s'),
        ];
    }
}
