<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,

            'customer_name' => $this->customer_name,
            'customer_phone' => $this->customer_phone,
            'shipping_address' => $this->shipping_address,

            'status' => $this->status,
            'payment_method' => $this->payment_method,
            'payment_status' => $this->payment_status,

            'subtotal' => (float) $this->subtotal,
            'shipping_cost' => (float) $this->shipping_cost,
            'total' => (float) $this->total,

            'items' => $this->whenLoaded(
                'items',
                fn () => $this->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'product_name' => $item->product_name,
                    'product_sku' => $item->product_sku,
                    'quantity' => $item->quantity,
                    'unit_price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ])->values()
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
