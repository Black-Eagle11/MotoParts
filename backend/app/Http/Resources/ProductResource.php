<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'category_id' => $this->category_id,

            'name' => $this->name,
            'slug' => $this->slug,
            'sku' => $this->sku,
            'description' => $this->description,

            'price' => (float) $this->price,
            'stock' => $this->stock,
            'is_active' => (bool) $this->is_active,

            'image_path' => $this->image_path,

            'image_url' => $this->image_path
                ? Storage::disk('public')->url($this->image_path)
                : null,

            'category' => $this->whenLoaded(
                'category',
                fn () => $this->category
                    ? new CategoryResource($this->category)
                    : null
            ),

            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
