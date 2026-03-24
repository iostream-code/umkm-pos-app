<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    /**
     * GET /api/v1/categories
     */
    public function index(Request $request): JsonResponse
    {
        $categories = Category::where('store_id', $request->user()->store_id)
            ->with('children:id,name,parent_id,color,icon,sort_order')
            ->whereNull('parent_id') // Hanya tampilkan root kategori
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(fn($cat) => [
                'id'         => $cat->id,
                'name'       => $cat->name,
                'slug'       => $cat->slug,
                'color'      => $cat->color,
                'icon'       => $cat->icon,
                'sort_order' => $cat->sort_order,
                'children'   => $cat->children,
            ]);

        return response()->json(['data' => $categories]);
    }

    /**
     * POST /api/v1/categories
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'parent_id'  => ['nullable', 'uuid', 'exists:categories,id'],
            'color'      => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'icon'       => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $slug = Str::slug($validated['name']);

        // Pastikan slug unik per toko
        $slugCount = Category::where('store_id', $request->user()->store_id)
            ->where('slug', 'like', "{$slug}%")
            ->count();

        $category = Category::create([
            ...$validated,
            'store_id' => $request->user()->store_id,
            'slug'     => $slugCount > 0 ? "{$slug}-{$slugCount}" : $slug,
        ]);

        return response()->json([
            'message'  => 'Kategori berhasil ditambahkan.',
            'category' => $category,
        ], 201);
    }

    /**
     * GET /api/v1/categories/{id}
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $category = Category::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->with(['children', 'parent:id,name'])
            ->firstOrFail();

        return response()->json(['category' => $category]);
    }

    /**
     * PUT /api/v1/categories/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $category = Category::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        $validated = $request->validate([
            'name'       => ['sometimes', 'string', 'max:100'],
            'parent_id'  => [
                'nullable', 'uuid',
                Rule::exists('categories', 'id')->where('store_id', $request->user()->store_id),
                // Cegah kategori menjadi child dari dirinya sendiri
                Rule::notIn([$id]),
            ],
            'color'      => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'icon'       => ['nullable', 'string', 'max:50'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $category->update($validated);

        return response()->json([
            'message'  => 'Kategori berhasil diperbarui.',
            'category' => $category->fresh(['children', 'parent']),
        ]);
    }

    /**
     * DELETE /api/v1/categories/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $category = Category::where('id', $id)
            ->where('store_id', $request->user()->store_id)
            ->firstOrFail();

        // Pindahkan produk dalam kategori ini ke uncategorized
        $category->products()->update(['category_id' => null]);

        // Pindahkan sub-kategori ke root
        $category->children()->update(['parent_id' => null]);

        $category->delete();

        return response()->json(['message' => 'Kategori berhasil dihapus.']);
    }
}
