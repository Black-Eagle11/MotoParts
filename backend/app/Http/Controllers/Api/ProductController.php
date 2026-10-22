<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Product::class);

        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'category_id' => ['sometimes', 'integer', 'min:1'],
            'min_price' => ['sometimes', 'numeric', 'min:0'],
            'max_price' => ['sometimes', 'numeric', 'min:0'],
            'sort' => [
                'sometimes',
                'in:newest,oldest,price_asc,price_desc,name_asc',
            ],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (
            isset($filters['min_price'], $filters['max_price']) &&
            $filters['min_price'] > $filters['max_price']
        ) {
            return response()->json([
                'message' => 'Harga minimum tidak boleh melebihi harga maksimum.',
            ], 422);
        }

        $isAdmin = $request->user()?->hasRole('admin') ?? false;

        $query = Product::query()->with('category');

        if (!$isAdmin) {
            $query->where('is_active', true);
        } elseif (array_key_exists('is_active', $filters)) {
            $query->where('is_active', $filters['is_active']);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where(function ($builder) use ($search) {
                $builder
                    ->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if (isset($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        if (isset($filters['min_price'])) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (isset($filters['max_price'])) {
            $query->where('price', '<=', $filters['max_price']);
        }

        switch ($filters['sort'] ?? 'newest') {
            case 'oldest':
                $query->oldest();
                break;

            case 'price_asc':
                $query->orderBy('price');
                break;

            case 'price_desc':
                $query->orderByDesc('price');
                break;

            case 'name_asc':
                $query->orderBy('name');
                break;

            default:
                $query->latest();
                break;
        }

        $products = $query
            ->paginate($filters['per_page'] ?? 12)
            ->withQueryString();

        return ProductResource::collection($products);
    }

    public function store(StoreProductRequest $request)
    {
        Gate::authorize('create', Product::class);

        $data = $request->validated();

        $image = $data['image'] ?? null;
        unset($data['image']);

        $data['slug'] = $this->uniqueSlug(
            $data['slug'] ?: $data['name']
        );

        $imagePath = null;

        if ($image) {
            $imagePath = $image->store('products', 'public');
            $data['image_path'] = $imagePath;
        }

        try {
            $product = Product::create($data);
        } catch (Throwable $exception) {
            if ($imagePath) {
                Storage::disk('public')->delete($imagePath);
            }

            throw $exception;
        }

        return (new ProductResource($product->load('category')))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Product $product): ProductResource
    {
        Gate::authorize('view', $product);

        return new ProductResource($product->load('category'));
    }

    public function update(UpdateProductRequest $request, Product $product): ProductResource
    {
        Gate::authorize('update', $product);

        $data = $request->validated();

        $image = $data['image'] ?? null;
        unset($data['image']);

        if (
            array_key_exists('slug', $data) ||
            (isset($data['name']) && $data['name'] !== $product->name)
        ) {
            $slugSource = $data['slug'] ?: ($data['name'] ?? $product->name);

            $data['slug'] = $this->uniqueSlug(
                $slugSource,
                $product->id
            );
        }

        $newImagePath = null;

        if ($image) {
            $newImagePath = $image->store('products', 'public');
            $data['image_path'] = $newImagePath;
        }

        $oldImagePath = $product->image_path;

        try {
            $product->update($data);
        } catch (Throwable $exception) {
            if ($newImagePath) {
                Storage::disk('public')->delete($newImagePath);
            }

            throw $exception;
        }

        if ($newImagePath && $oldImagePath) {
            Storage::disk('public')->delete($oldImagePath);
        }

        return new ProductResource($product->refresh()->load('category'));
    }

    public function destroy(Product $product)
    {
        Gate::authorize('delete', $product);

        $imagePath = $product->image_path;

        $product->delete();

        if ($imagePath) {
            Storage::disk('public')->delete($imagePath);
        }

        return response()->json([
            'message' => 'Produk berhasil dihapus.',
        ]);
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'product';
        $slug = $base;
        $counter = 2;

        while (
            Product::query()
                ->where('slug', $slug)
                ->when(
                    $ignoreId,
                    fn ($query) => $query->where('id', '!=', $ignoreId)
                )
                ->exists()
        ) {
            $slug = $base . '-' . $counter++;
        }

        return $slug;
    }
}
