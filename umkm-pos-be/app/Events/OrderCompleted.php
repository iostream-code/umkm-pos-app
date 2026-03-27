<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Event: broadcast ke dashboard real-time via Laravel Reverb (WebSocket).
 * React dashboard mendengarkan channel ini untuk update live.
 */
class OrderCompleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Order $order) {}

    public function broadcastOn(): array
    {
        return [
            new Channel("store.{$this->order->store_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'order.completed';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'     => $this->order->id,
            'order_number' => $this->order->order_number,
            'total'        => $this->order->total,
            'created_at'   => $this->order->created_at->toIso8601String(),
        ];
    }
}
