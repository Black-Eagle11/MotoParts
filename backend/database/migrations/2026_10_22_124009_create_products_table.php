<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();

            $table->foreignId('category_id')
                ->constrained('categories')
                ->restrictOnDelete();

            $table->string('name', 160);
            $table->string('slug', 180)->unique();
            $table->string('sku', 80)->unique();

            $table->text('description')->nullable();

            $table->decimal('price', 12, 2);
            $table->unsignedInteger('stock')->default(0);

            $table->string('image_path')->nullable();

            $table->boolean('is_active')->default(true);

            $table->timestamps();

            $table->index(['category_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
