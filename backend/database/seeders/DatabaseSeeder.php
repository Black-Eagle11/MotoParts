<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin demo

        $admin = User::firstOrNew([
            'email' => 'admin@motoparts.test',
        ]);

        $admin->name = 'MotoParts Admin';
        $admin->password = Hash::make('MotoAdmin123!');
        $admin->forceFill([
            'role' => 'admin',
        ]);
        $admin->save();

        // Customer demo

        $customer = User::firstOrNew([
            'email' => 'customer@motoparts.test',
        ]);

        $customer->name = 'MotoParts Customer';
        $customer->password = Hash::make('Customer123!');
        $customer->forceFill([
            'role' => 'customer',
        ]);
        $customer->save();

        // Categories

        $categories = [
            [
                'name' => 'Oli dan Pelumas',
                'slug' => 'oli-dan-pelumas',
                'description' => 'Oli mesin dan pelumas untuk sepeda motor.',
            ],
            [
                'name' => 'Sistem Pengereman',
                'slug' => 'sistem-pengereman',
                'description' => 'Kampas rem dan komponen pengereman.',
            ],
            [
                'name' => 'Kelistrikan',
                'slug' => 'kelistrikan',
                'description' => 'Busi dan komponen kelistrikan sepeda motor.',
            ],
            [
                'name' => 'Rantai dan Penggerak',
                'slug' => 'rantai-dan-penggerak',
                'description' => 'Rantai dan komponen sistem penggerak.',
            ],
            [
                'name' => 'Filter',
                'slug' => 'filter',
                'description' => 'Filter udara dan komponen penyaringan.',
            ],
        ];

        foreach ($categories as $data) {
            Category::updateOrCreate(
                ['slug' => $data['slug']],
                [
                    'name' => $data['name'],
                    'description' => $data['description'],
                    'is_active' => true,
                ]
            );
        }

        // Products

        $products = [
            [
                'category_slug' => 'oli-dan-pelumas',
                'name' => 'Oli Mesin Motor 10W-40 1L',
                'slug' => 'oli-mesin-motor-10w40-1l',
                'sku' => 'OLI-10W40-001',
                'description' => 'Oli mesin motor untuk pemakaian harian.',
                'price' => 85000,
                'stock' => 30,
            ],
            [
                'category_slug' => 'sistem-pengereman',
                'name' => 'Kampas Rem Depan',
                'slug' => 'kampas-rem-depan',
                'sku' => 'REM-DEP-001',
                'description' => 'Kampas rem depan. Pastikan kompatibilitas motor.',
                'price' => 45000,
                'stock' => 25,
            ],
            [
                'category_slug' => 'kelistrikan',
                'name' => 'Busi Motor Standar',
                'slug' => 'busi-motor-standar',
                'sku' => 'BUSI-STD-001',
                'description' => 'Busi pengapian standar untuk tipe motor yang sesuai.',
                'price' => 25000,
                'stock' => 40,
            ],
            [
                'category_slug' => 'rantai-dan-penggerak',
                'name' => 'Rantai Motor Tipe 428',
                'slug' => 'rantai-motor-tipe-428',
                'sku' => 'RANTAI-428-001',
                'description' => 'Rantai motor tipe 428. Periksa spesifikasi kendaraan.',
                'price' => 125000,
                'stock' => 15,
            ],
            [
                'category_slug' => 'filter',
                'name' => 'Filter Udara Motor',
                'slug' => 'filter-udara-motor',
                'sku' => 'FILTER-UDR-001',
                'description' => 'Filter udara pengganti untuk tipe motor yang sesuai.',
                'price' => 35000,
                'stock' => 20,
            ],
        ];

        foreach ($products as $data) {
            $category = Category::where(
                'slug',
                $data['category_slug']
            )->firstOrFail();

            Product::updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'category_id' => $category->id,
                    'name' => $data['name'],
                    'slug' => $data['slug'],
                    'description' => $data['description'],
                    'price' => $data['price'],
                    'stock' => $data['stock'],
                    'image_path' => null,
                    'is_active' => true,
                ]
            );
        }
    }
}
