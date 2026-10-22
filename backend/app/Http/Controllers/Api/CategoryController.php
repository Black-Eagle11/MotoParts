<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $filters = $request->validate([
            'search' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $isAdmin = $request->user()?->hasRole('admin') ?? false;

        $query = Category::query()
            ->withCount([
                'products' => function ($query) use ($isAdmin) {
                    if (!$isAdmin) {
                        $query->where('is_active', true);
                    }
                },
            ]);

        if (!$isAdmin) {
            $query->where('is_active', true);
        }

        if (!empty($filters['search'])) {
            $search = $filters['search'];

            $query->where('name', 'like', "%{$search}%");
        }

        $categories = $query
            ->orderBy('name')
            ->paginate($filters['per_page'] ?? 15)
            ->withQueryString();

        return CategoryResource::collection($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'slug' => [
                'nullable',
                'string',
                'max:120',
                'unique:categories,slug',
            ],
            'description' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $data['slug'] = $this->uniqueSlug(
            $data['slug'] ?: $data['name']
        );

        $category = Category::create($data);

        return (new CategoryResource($category))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Category $category): CategoryResource
    {
        $isAdmin = $request->user()?->hasRole('admin') ?? false;

        abort_unless($category->is_active || $isAdmin, 404);

        $category->loadCount('products');

        return new CategoryResource($category);
    }

    public function update(Request $request, Category $category): CategoryResource
    {
        $this->ensureAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'slug' => [
                'sometimes',
                'nullable',
                'string',
                'max:120',
                Rule::unique('categories', 'slug')->ignore($category->id),
            ],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (
            array_key_exists('slug', $data) ||
            (isset($data['name']) && $data['name'] !== $category->name)
        ) {
            $slugSource = $data['slug'] ?: ($data['name'] ?? $category->name);

            $data['slug'] = $this->uniqueSlug(
                $slugSource,
                $category->id
            );
        }

        $category->update($data);

        return new CategoryResource($category->refresh());
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        $this->ensureAdmin($request);

        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Kategori tidak dapat dihapus karena masih memiliki produk.',
            ], 409);
        }

        $category->delete();

        return response()->json([
            'message' => 'Kategori berhasil dihapus.',
        ]);
    }

    private function ensureAdmin(Request $request): void
    {
        abort_unless(
            $request->user()?->hasRole('admin'),
            403,
            'Hanya admin yang dapat mengelola kategori.'
        );
    }

    private function uniqueSlug(string $value, ?int $ignoreId = null): string
    {
        $base = Str::slug($value) ?: 'category';
        $slug = $base;
        $counter = 2;

        while (
            Category::query()
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
