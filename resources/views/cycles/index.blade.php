@extends('layouts.app')

@section('content')
<style>
/* ------------------------------------------------------------------
   Cycle Index – custom styles (no Tailwind)
   ------------------------------------------------------------------ */

/* Main wrapper – replaces .container.mx-auto.flex.flex-col.items-center.min-h-screen.px-4 */
.cycle-container {
    max-width: 100%;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Title section – replaces .cycle-title.flex.justify-between.items-center.w-full.max-w-4xl.mb-12 */
.cycle-title-section {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-width: 1024px; /* matches max-w-4xl */
    margin-bottom: 3rem;
}

/* Page title – replaces .text-4xl.font-bold */
.cycle-title {
    font-size: 2.25rem;
    font-weight: 700;
    color: #1a1a1a;
}
.dark .cycle-title {
    color: #e9ecef;
}

/* Create new button – replaces .btn.btn-primary.px-6.py-3.rounded-full.text-lg.font-semibold.text-center */
.btn-create-new {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: #007bff;
    color: #fff;
    text-decoration: none;
    border-radius: 9999px; /* full rounding */
    font-size: 1.125rem;
    font-weight: 600;
    text-align: center;
    transition: background-color 0.2s ease;
}
.btn-create-new:hover {
    background-color: #0056b3;
}

/* Success message – replaces .bg-green-100.text-green-700.p-4.rounded-lg.mb-6.w-full.max-w-4xl */
.success-message {
    background-color: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    width: 100%;
    max-width: 1024px;
}
.dark .success-message {
    background-color: #2d6a4f;
    color: #d4edda;
}

/* Cycle grid – replaces .w-full.gap-4.grid.grid-temp */
.cycle-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

/* Individual cycle card – replaces .bg-white.rounded-sm.flex.justify-center.items-center.flex-col.gap-4.border.border-black.w-200.h-200 */
.cycle-card {
    background: #ffffff;
    border-radius: 0.125rem;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    gap: 1rem;
    border: 1px solid #000000;
    width: 200px;
    height: 200px;
    text-decoration: none;
    color: #1a1a1a;
}
.cycle-card:hover {
    background: #f8f9fa;
}
.dark .cycle-card {
    background: #161615;
    border-color: #444;
    color: #e9ecef;
}
.dark .cycle-card:hover {
    background: #2a2a2a;
}

/* Cycle name – replaces empty class on h3 */
.cycle-name {
    font-size: 1.25rem;
    font-weight: 500;
    margin: 0;
}

/* Cycle status – replaces empty class on p */
.cycle-status {
    font-size: 1rem;
    margin: 0;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    body.dark .cycle-container {
        color: #adb5bd;
    }
}
</style>

<div class="cycle-container">
    <div class="cycle-title-section">
        <h1 class="cycle-title">Danh sách chu kỳ</h1>
        <a href="{{ route('cycles.create') }}" class="btn-create-new">Tạo mới</a>
    </div>
    @if(session('success'))
        <div class="success-message">
            {{ session('success') }}
        </div>
    @endif
    <div class="cycle-grid">
        @foreach($cycles as $cycle)
        <a href="{{ route('cycles.show', $cycle) }}" class="cycle-card">
            <h3 class="cycle-name">{{ $cycle->cycle_name }}</h3>
            <p class="cycle-status">Trạng thái: {{ $cycle->status }}</p>
        </a>
        @endforeach
    </div>
</div>
@endsection