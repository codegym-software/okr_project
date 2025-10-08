@extends('layouts.app')

@section('title', 'Danh sách chu kỳ - CodeGym OKR')

@section('content')
<style>
/* ------------------------------------------------------------------
   Cycles List – custom styles (no Bootstrap)
   ------------------------------------------------------------------ */

/* Main wrapper – replaces .container */
.cycles-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
}

/* Column – replaces .col-md-12 */
.cycles-column {
    flex: 0 0 100%;
    max-width: 100%;
    padding: 0 15px;
}

/* Card – replaces .card */
.cycle-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}
.dark .cycle-card {
    background: #161615;
    border-color: #374151;
}

/* Card header – replaces .card-header */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid #e5e7eb;
}
.dark .card-header {
    background: #1f2937;
    border-color: #4b5563;
}

/* Card header title – replaces h3 */
.card-header-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
}
.dark .card-header-title {
    color: #e9ecef;
}

/* Card body – replaces .card-body */
.card-body {
    padding: 1.5rem;
}

/* Success message */
.success-message {
    background: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 0.25rem;
    margin-bottom: 1rem;
    border-left: 4px solid #16a34a;
}
.dark .success-message {
    background: #2d6a4f;
    color: #d4edda;
    border-left-color: #22c55e;
}

/* Cycle item – replaces .list-group-item */
.cycle-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    text-decoration: none;
    color: inherit;
    transition: all 0.2s ease;
}
.dark .cycle-item {
    background: #1f2937;
    border-color: #4b5563;
}
.cycle-item:hover {
    background: #e5e7eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}
.dark .cycle-item:hover {
    background: #374151;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

/* Cycle title – replaces h6 */
.cycle-title {
    font-size: 1rem;
    font-weight: 500;
    color: #111827;
    margin: 0;
}
.dark .cycle-title {
    color: #e9ecef;
}

/* Status badge – replaces .badge */
.status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 0.25rem;
    color: #ffffff;
}
.status-badge.draft {
    background: #6b7280;
}
.status-badge.active {
    background: #2563eb;
}
.status-badge.completed {
    background: #16a34a;
}
.status-badge.default {
    background: #6b7280;
}
.dark .status-badge {
    color: #e5e7eb;
}

/* Cycles list wrapper */
.cycles-list-wrapper {
    max-height: 70vh;
    overflow-y: auto;
    padding-right: 0.5rem; /* For scrollbar space */
}

/* Empty cycles – replaces .text-center.py-4 */
.empty-cycles {
    text-align: center;
    padding: 2rem 0;
}

/* Empty cycles icon – replaces .display-1.text-muted */
.empty-cycles-icon {
    font-size: 4rem;
    color: #6b7280;
}
.dark .empty-cycles-icon {
    color: #9ca3af;
}

/* Empty cycles title – replaces h6.mt-3 */
.empty-cycles-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-top: 0.75rem;
}
.dark .empty-cycles-title {
    color: #d1d5db;
}

/* Empty cycles text – replaces .text-muted */
.empty-cycles-text {
    color: #6b7280;
    margin: 0;
}
.dark .empty-cycles-text {
    color: #9ca3af;
}

/* Add cycle button – replaces .btn.btn-primary */
.add-cycle-button {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: #2563eb;
    color: #ffffff;
    border-radius: 0.25rem;
    font-weight: 500;
    text-decoration: none;
    transition: background 0.2s ease;
}
.add-cycle-button:hover {
    background: #1d4ed8;
}
.dark .add-cycle-button {
    background: #1e40af;
}
.dark .add-cycle-button:hover {
    background: #1e3a8a;
}

/* Icon styles for Bootstrap Icons (bi) */
.bi {
    margin-right: 0.5rem;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    body.dark .cycles-row {
        color: #d1d5db;
    }
}

/* Scrollbar styling */
.cycles-list-wrapper::-webkit-scrollbar {
    width: 6px;
}
.cycles-list-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.dark .cycles-list-wrapper::-webkit-scrollbar-track {
    background: #374151;
}
.cycles-list-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
.dark .cycles-list-wrapper::-webkit-scrollbar-thumb {
    background: #6b7280;
}
</style>

<div class="cycles-row">
    <div class="cycles-column">
        <div class="cycle-card">
            <div class="card-header">
                <h3 class="card-header-title"><i class="bi bi-calendar3"></i> Danh sách chu kỳ</h3>
                @php
                $isAdmin = Auth::user() && Auth::user() -> isAdmin();
                @endphp
                @if($isAdmin) 
                <a href="{{ route('cycles.create') }}" class="add-cycle-button">
                    <i class="bi bi-plus-circle"></i> Tạo mới
                </a>
                @endif
            </div>
            <div class="card-body">
                @if(session('success'))
                    <div class="success-message">
                        {{ session('success') }}
                    </div>
                @endif

                @if($cycles->count() > 0)
                    <div class="cycles-list-wrapper">
                        @foreach($cycles as $cycle)
                            <a href="{{ route('cycles.show', $cycle) }}" class="cycle-item">
                                <h6 class="cycle-title">{{ $cycle->cycle_name }}</h6>
                                @php
                                    $statusClass = match($cycle->is_active) {
                                        'draft' => 'draft',
                                        'active' => 'active',
                                        'completed' => 'completed',
                                        // default => 'default'
                                    };
                                    $statusIcon = match($cycle->is_active) {
                                        'draft' => 'bi-pencil-square',
                                        'active' => 'bi-play-circle',
                                        'completed' => 'bi-check-circle',
                                        default => 'bi-question-circle'
                                    };
                                @endphp
                                <span class="status-badge {{ $statusClass }}">
                                    <i class="bi {{ $statusIcon }}"></i> {{ ucfirst($cycle->is_active) }}
                                </span>
                            </a>
                        @endforeach
                    </div>
                @else
                    <div class="empty-cycles">
                        <i class="bi bi-calendar3-week empty-cycles-icon"></i>
                        <h6 class="empty-cycles-title">Chưa có chu kỳ nào</h6>
                        <p class="empty-cycles-text">Tạo chu kỳ đầu tiên để bắt đầu quản lý OKR của bạn.</p>
                    </div>
                @endif
            </div>
        </div>
    </div>
</div>
@endsection