@extends('layouts.app')

@section('title', '{{ $cycle->cycle_name }} - CodeGym OKR')

@section('content')
<style>
/* ------------------------------------------------------------------
   Cycle Show – custom styles (no Bootstrap)
   ------------------------------------------------------------------ */

/* CSS Variables */
:root {
    --primary: #2563eb;
    --primary-dark: #1d4ed8;
    --bg-light: #ffffff;
    --bg-dark: #161615;
    --text-main: #111827;
    --text-light: #6b7280;
    --border-light: #e5e7eb;
    --border-dark: #374151;
}

/* Container */
.cycles-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    max-width: 960px;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
}

/* Column */
.cycles-column {
    flex: 0 0 100%;
    max-width: 100%;
    padding: 0 15px;
}

/* Card */
.cycle-card {
    background: var(--bg-light);
    border: 1px solid var(--border-light);
    border-radius: 0.375rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}
.dark .cycle-card {
    background: var(--bg-dark);
    border-color: var(--border-dark);
}

/* Card header */
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: #f8f9fa;
    border-bottom: 1px solid var(--border-light);
}
.dark .card-header {
    background: #1f2937;
    border-color: #4b5563;
}

/* Card header title */
.card-header-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-main);
    margin: 0;
}
.dark .card-header-title {
    color: #e9ecef;
}

/* Card body */
.card-body {
    padding: 1.5rem;
}

/* Cycle info */
.cycle-info {
    margin-bottom: 1.5rem;
}
.cycle-info-item {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    color: var(--text-light);
}
.cycle-info-item strong {
    width: 120px;
    font-weight: 600;
    color: var(--text-main);
}
.dark .cycle-info-item {
    color: #9ca3af;
}
.dark .cycle-info-item strong {
    color: #e9ecef;
}

/* Status badge */
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
    background: var(--primary);
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

/* Objectives wrapper */
.objectives-wrapper {
    margin-top: 1.5rem;
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
}

/* Objective card */
.objective-card {
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
    cursor: pointer;
}
.objective-card:hover {
    background: #e5e7eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}
.dark .objective-card {
    background: #1f2937;
    border-color: #4b5563;
}
.dark .objective-card:hover {
    background: #374151;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

/* Objective icon */
.objective-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    margin-right: 1rem;
}

/* Objective content */
.objective-content {
    flex: 1;
}
.objective-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-main);
    margin: 0;
}
.dark .objective-title {
    color: #e9ecef;
}
.objective-desc {
    font-size: 0.875rem;
    color: var(--text-light);
    margin: 0.25rem 0 0;
}
.dark .objective-desc {
    color: #9ca3af;
}

/* Key result styles */
.key-result-card {
    display: flex;
    align-items: center;
    background: #ffffff;
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    margin-left: 2rem;
}
.dark .key-result-card {
    background: #2d3748;
    border-color: #4b5563;
}
.key-result-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-main);
    margin: 0;
}
.dark .key-result-title {
    color: #e9ecef;
}
.key-result-desc {
    font-size: 0.75rem;
    color: var(--text-light);
    margin: 0.25rem 0 0;
}
.dark .key-result-desc {
    color: #9ca3af;
}

/* Hidden class for toggling */
.hidden {
    display: none;
}

/* Empty objectives */
.empty-objectives {
    text-align: center;
    padding: 2rem 0;
}
.empty-objectives-icon {
    font-size: 4rem;
    color: var(--text-light);
}
.dark .empty-objectives-icon {
    color: #9ca3af;
}
.empty-objectives-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
    margin-top: 0.75rem;
}
.dark .empty-objectives-title {
    color: #e9ecef;
}
.empty-objectives-text {
    color: var(--text-light);
    margin: 0;
}
.dark .empty-objectives-text {
    color: #9ca3af;
}

/* Add objective/key result button */
.add-objective-button,
.add-key-result-button {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: var(--primary);
    color: #ffffff;
    border-radius: 0.25rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
}
.add-objective-button:hover,
.add-key-result-button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}
.dark .add-objective-button,
.dark .add-key-result-button {
    background: #1e40af;
}
.dark .add-objective-button:hover,
.dark .add-key-result-button:hover {
    background: #1e3a8a;
}

/* Icon styles for Bootstrap Icons */
.bi {
    margin-right: 0.5rem;
}

/* Scrollbar styling */
.objectives-wrapper::-webkit-scrollbar {
    width: 6px;
}
.objectives-wrapper::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.dark .objectives-wrapper::-webkit-scrollbar-track {
    background: #374151;
}
.objectives-wrapper::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
.dark .objectives-wrapper::-webkit-scrollbar-thumb {
    background: #6b7280;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    body.dark .cycles-row {
        color: #d1d5db;
    }
}
</style>

<div class="cycles-row">
    <div class="cycles-column">
        <div class="cycle-card">
            <div class="card-header">
                <h3 class="card-header-title"><i class="bi bi-calendar3"></i> {{ $cycle->cycle_name }}</h3>
                @php
                    $statusClass = match($cycle->is_active) {
                        'draft' => 'draft',
                        'active' => 'active',
                        'completed' => 'completed',
                        default => 'default'
                    };
                    $statusIcon = match($cycle->is_active) {
                        'draft' => 'bi-pencil-square',
                        'active' => 'bi-play-circle',
                        'completed' => 'bi-check-circle',
                        default => 'bi-question-circle'
                    };
                @endphp
                <span class="status-badge {{ $statusClass }}">
                    <i class="bi {{ $statusIcon }}"></i> {{ ucfirst($cycle->status) }}
                </span>
            </div>
            <div class="card-body">
                @if(session('success'))
                    <div class="success-message">
                        {{ session('success') }}
                    </div>
                @endif

                <div class="cycle-info">
                    <div class="cycle-info-item">
                        <strong>Ngày bắt đầu:</strong>
                        <span>{{ \Carbon\Carbon::parse($cycle->start_date)->format('d/m/Y') }}</span>
                    </div>
                    <div class="cycle-info-item">
                        <strong>Ngày kết thúc:</strong>
                        <span>{{ \Carbon\Carbon::parse($cycle->end_date)->format('d/m/Y') }}</span>
                    </div>
                    <div class="cycle-info-item">
                        <strong>Mô tả:</strong>
                        <span>{{ $cycle->description ?? 'Không có mô tả' }}</span>
                    </div>
                </div>

                <a href="{{ route('objectives.create', ['cycle_id' => $cycle->cycle_id]) }}" class="add-objective-button">
                    <i class="bi bi-plus-circle"></i> Thêm Objective
                </a>

                <div class="objectives-wrapper">
                    @if($objectives->count() > 0)
                        @foreach($objectives as $objective)
                            <div class="objective-card" data-objective-id="{{ $objective->obj_id }}">
                                <div class="objective-icon">
                                    {{ strtoupper(substr($objective->obj_title, 0, 1)) }}
                                </div>
                                <div class="objective-content">
                                    <h6 class="objective-title">{{ $objective->obj_title }}</h6>
                                    <p class="objective-desc">{{ $objective->obj_desc ?? 'Không có mô tả' }}</p>
                                </div>
                                <a href="{{ route('key_results.create', ['objective' => $objective->obj_id]) }}" class="add-key-result-button">
                                    <i class="bi bi-plus-circle"></i> Thêm Key Result
                                </a>
                            </div>
                            <div class="key-results-wrapper hidden" id="key-results-{{ $objective->obj_id }}" style="margin-left: 2rem; margin-bottom: 0.5rem;">
                                @if($objective->keyResults->count() > 0)
                                    @foreach($objective->keyResults as $keyResult)
                                        <a href="{{ route('key_results.show', ['objective' => $objective->obj_id, 'key_result' => $keyResult->kr_id]) }}"
                                        class="key-result-card" style="display:block; text-decoration:none; color:inherit;">
                                            <div class="objective-content">
                                                <h6 class="key-result-title">{{ $keyResult->kr_title }}</h6>
                                                <p class="key-result-desc">{{ $keyResult->status ?? 'Không có trạng thái' }}</p>
                                            </div>
                                        </a>
                                    @endforeach
                                @else
                                    <div class="empty-objectives">
                                        <i class="bi bi-list-task empty-objectives-icon"></i>
                                        <h6 class="empty-objectives-title">Chưa có Key Result</h6>
                                        <p class="empty-objectives-text">Thêm Key Result để bắt đầu quản lý mục tiêu này.</p>
                                    </div>
                                @endif
                            </div>
                        @endforeach
                    @else
                        <div class="empty-objectives">
                            <i class="bi bi-list-task empty-objectives-icon"></i>
                            <h6 class="empty-objectives-title">Chưa có mục tiêu nào</h6>
                            <p class="empty-objectives-text">Thêm mục tiêu để bắt đầu quản lý chu kỳ này.</p>
                        </div>
                    @endif
                </div>
            </div>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
    const objectiveCards = document.querySelectorAll('.objective-card');
    
    objectiveCards.forEach(card => {
        card.addEventListener('click', function (event) {
            // Prevent toggling when clicking the "Add Key Result" button
            if (event.target.closest('.add-key-result-button')) {
                return;
            }
            
            const objectiveId = this.getAttribute('data-objective-id');
            const keyResultsWrapper = document.getElementById(`key-results-${objectiveId}`);
            
            // Toggle the hidden class
            keyResultsWrapper.classList.toggle('hidden');
        });
    });
});
</script>
@endsection