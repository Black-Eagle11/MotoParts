<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreOrderRequest;
use App\Http\Requests\UpdateOrderStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        Gate::authorize('viewAny', Order::class);

        $query = Order::query()
            ->with('items')
            ->latest();

        if (!$request->user()->hasRole('admin')) {
            $query->where('user_id', $request->user()->id);
        }

        return OrderResource::collection(
            $query->paginate(10)->withQueryString()
        );
    }

    public function store(StoreOrderRequest $request)
    {
        Gate::authorize('create', Order::class);

        $data = $request->validated();

        $order = DB::transaction(function () use ($request, $data) {
            $productIds = collect($data['items'])
                ->pluck('product_id')
                ->all();

            $products = Product::query()
                ->whereIn('id', $productIds)
                ->where('is_active', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($productIds)) {
                throw ValidationException::withMessages([
                    'items' => [
                        'Satu atau lebih produk tidak tersedia.',
                    ],
                ]);
            }

            $subtotalCents = 0;
            $preparedItems = [];

            foreach ($data['items'] as $index => $item) {
                $product = $products->get($item['product_id']);
                $quantity = (int) $item['quantity'];

                if ($product->stock < $quantity) {
                    throw ValidationException::withMessages([
                        "items.{$index}.quantity" => [
                            "Stok {$product->name} tidak mencukupi.",
                        ],
                    ]);
                }

                $unitPriceCents = (int) round(
                    (float) $product->price * 100
                );

                $lineTotalCents = $unitPriceCents * $quantity;
                $subtotalCents += $lineTotalCents;

                $preparedItems[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unit_price' => number_format(
                        $unitPriceCents / 100,
                        2,
                        '.',
                        ''
                    ),
                    'subtotal' => number_format(
                        $lineTotalCents / 100,
                        2,
                        '.',
                        ''
                    ),
                ];
            }

            $shippingCents = 0;
            $totalCents = $subtotalCents + $shippingCents;

            $order = $request->user()->orders()->create([
                'order_number' => 'MP-' . now()->format('ymdHis')
                    . '-' . Str::upper(Str::random(6)),

                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'shipping_address' => $data['shipping_address'],

                'status' => 'pending',
                'payment_method' => $data['payment_method'],
                'payment_status' => 'unpaid',

                'subtotal' => number_format(
                    $subtotalCents / 100,
                    2,
                    '.',
                    ''
                ),
                'shipping_cost' => number_format(
                    $shippingCents / 100,
                    2,
                    '.',
                    ''
                ),
                'total' => number_format(
                    $totalCents / 100,
                    2,
                    '.',
                    ''
                ),
            ]);

            foreach ($preparedItems as $prepared) {
                $product = $prepared['product'];
                $quantity = $prepared['quantity'];

                $order->items()->create([
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'product_sku' => $product->sku,
                    'quantity' => $quantity,
                    'unit_price' => $prepared['unit_price'],
                    'subtotal' => $prepared['subtotal'],
                ]);

                $product->decrement('stock', $quantity);
            }

            return $order->load('items');
        });

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Order $order): OrderResource
    {
        Gate::authorize('view', $order);

        return new OrderResource($order->load('items'));
    }

    public function updateStatus(
        UpdateOrderStatusRequest $request,
        Order $order
    ): JsonResponse|OrderResource {
        $newStatus = $request->validated()['status'];

        $updatedOrder = DB::transaction(function () use ($order, $newStatus) {
            $lockedOrder = Order::query()
                ->whereKey($order->id)
                ->lockForUpdate()
                ->firstOrFail();

            Gate::authorize('updateStatus', $lockedOrder);

            $allowedTransitions = [
                'pending' => ['confirmed', 'cancelled'],
                'confirmed' => ['processing', 'cancelled'],
                'processing' => ['shipped', 'cancelled'],
                'shipped' => ['completed'],
                'completed' => [],
                'cancelled' => [],
            ];

            if (!in_array(
                $newStatus,
                $allowedTransitions[$lockedOrder->status] ?? [],
                true
            )) {
                throw ValidationException::withMessages([
                    'status' => [
                        'Perubahan status pesanan tidak diizinkan.',
                    ],
                ]);
            }

            if ($newStatus === 'cancelled') {
                $lockedOrder->load('items');

                foreach ($lockedOrder->items as $item) {
                    if (!$item->product_id) {
                        continue;
                    }

                    $product = Product::query()
                        ->whereKey($item->product_id)
                        ->lockForUpdate()
                        ->first();

                    if ($product) {
                        $product->increment('stock', $item->quantity);
                    }
                }
            }

            $lockedOrder->status = $newStatus;
            $lockedOrder->save();

            return $lockedOrder->load('items');
        });

        return (new OrderResource($updatedOrder))->response();
    }
}
