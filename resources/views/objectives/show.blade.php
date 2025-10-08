@extends('layouts.app')

@section('title', '{{ $objective->title }} - CodeGym OKR')

@section('content')
<style>
/* ------------------------------------------------------------------
   Objective Show – custom styles (no Bootstrap)
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

/* Main wrapper */
.objective-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    max-width: 960px;
    margin: 2.5rem auto;
    padding: 0 1.5rem;
}

/* Column */
.objective-column {
    flex: 0 0 100%;
    max-width: 100%;
    padding: 0 15px;
}

/* Card */
.objective-card {
    background: var(--bg-light);
    border: 1px solid var(--border-light);
    border-radius: 0.375rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}
.dark .objective-card {
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

/* Objective info */
.objective-info {
    margin-bottom: 1.5rem;
}
.objective-info-item {
    display: flex;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.95rem;
    color: var(--text-light);
}
.objective-info-item strong {
    width: 120px;
    font-weight: 600;
    color: var(--text-main);
}
.dark .objective-info-item {
    color: #9ca3af;
}
.dark .objective-info-item strong {
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

/* Key results section */
.key-results-section {
    margin-bottom: 1.5rem;
}
.key-results-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-main);
    margin-bottom: 0.75rem;
}
.dark .key-results-title {
    color: #e9ecef;
}

/* Key results list */
.key-results-list {
    max-height: 60vh;
    overflow-y: auto;
    padding-right: 0.5rem;
}

/* Key result item */
.key-result-item {
    display: flex;
    align-items: center;
    background: #f8f9fa;
    border: 1px solid var(--border-light);
    border-radius: 0.25rem;
    padding: 1rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s ease;
}
.key-result-item:hover {
    background: #e5e7eb;
    transform: translateY(-2px);
    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}
.dark .key-result-item {
    background: #1f2937;
    border-color: #4b5563;
}
.dark .key-result-item:hover {
    background: #374151;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
}

/* Key result icon */
.key-result-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    margin-right: 1rem;
}

/* Key result content */
.key-result-content {
    flex: 1;
}
.key-result-title {
    font-size: 1rem;
    font-weight: 500;
    color: var(--text-main);
    margin: 0;
}
.dark .key-result-title {
    color: #e9ecef;
}
.key-result-desc {
    font-size: 0.875rem;
    color: var(--text-light);
    margin: 0.25rem 0 0;
}
.dark .key-result-desc {
    color: #9ca3af;
}

/* Key result status */
.key-result-status {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: #ffffff;
    border-radius: 0.25rem;
}
.key-result-status.not_started {
    background: #6b7280;
}
.key-result-status.in_progress {
    background: #f59e0b;
}
.key-result-status.completed {
    background: #16a34a;
}
.key-result-status.default {
    background: #6b7280;
}
.dark .key-result-status {
    color: #e5e7eb;
}

/* Progress bar */
.progress-wrapper {
    height: 12px;
    background: #e5e7eb;
    border-radius: 0.25rem;
    overflow: hidden;
    margin-top: 0.5rem;
}
.dark .progress-wrapper {
    background: #4b5563;
}
.progress-bar {
    height: 100%;
    background: var(--primary);
    transition: width 0.5s ease-in-out;
}
.dark .progress-bar {
    background: #60a5fa;
}
.progress-text {
    font-size: 0.75rem;
    color: var(--text-light);
    margin-top: 0.25rem;
}
.dark .progress-text {
    color: #9ca3af;
}

/* Empty key results */
.empty-key-results {
    text-align: center;
    padding: 2rem 0;
}
.empty-key-results-icon {
    font-size: 4rem;
    color: var(--text-light);
}
.dark .empty-key-results-icon {
    color: #9ca3af;
}
.empty-key-results-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-main);
    margin-top: 0.75rem;
}
.dark .empty-key-results-title {
    color: #e9ecef;
}
.empty-key-results-text {
    color: var(--text-light);
    margin: 0;
}
.dark .empty-key-results-text {
    color: #9ca3af;
}

/* Add KR button */
.add-kr-button {
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
.add-kr-button:hover {
    background: var(--primary-dark);
    transform: translateY(-2px);
}
.dark .add-kr-button {
    background: #1e40af;
}
.dark .add-kr-button:hover {
    background: #1e3a8a;
}

/* Icon styles for Bootstrap Icons */
.bi {
    margin-right: 0.5rem;
}

/* Scrollbar styling */
.key-results-list::-webkit-scrollbar {
    width: 6px;
}
.key-results-list::-webkit-scrollbar-track {
    background: #f1f1f1;
}
.dark .key-results-list::-webkit-scrollbar-track {
    background: #374151;
}
.key-results-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
}
.dark .key-results-list::-webkit-scrollbar-thumb {
    background: #6b7280;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
    body.dark .objective-row {
        color: #d1d5db;
    }
}
</style>

<div class="objective-row">
    <div class="objective-column">
        <div class="objective-card">
            <div class="card-header">
                <h3 class="card-header-title"><i class="bi bi-eye"></i> {{ $objective->title }}</h3>
                @php
                    $statusClass = match($objective->status) {
                        'draft' => 'draft',
                        'active' => 'active',
                        'completed' => 'completed',
                        default => 'default'
                    };
                    $statusIcon = match($objective->status) {
                        'draft' => 'bi-pencil-square',
                        'active' => 'bi-play-circle',
                        'completed' => 'bi-check-circle',
                        default => 'bi-question-circle'
                    };
                @endphp
                <span class="status-badge {{ $statusClass }}">
                    <i class="bi {{ $statusIcon }}"></i> {{ ucfirst($objective->status) }}
                </span>
            </div>
            <div class="card-body">
                @if(session('success'))
                    <div class="success-message">
                        {{ session('success') }}
                    </div>
                @endif

                <div class="objective-info">
                    <div class="objective-info-item">
                        <strong>Tiêu đề:</strong>
                        <span>{{ $objective->obj_title }}</span>
                    </div>
                    @if($objective->description)
                        <div class="objective-info-item">
                            <strong>Mô tả:</strong>
                            <span>{{ $objective->description }}</span>
                        </div>
                    @endif
                </div>

                <div class="key-results-section">
                    <h5 class="key-results-title"><i class="bi bi-key"></i> Key Results</h5>
                    @if($objective->keyResults->count() > 0)
                        <div class="key-results-list">
                            @foreach($objective->keyResults as $index => $keyResult)
                                <div class="key-result-item">
                                    <div class="key-result-icon">
                                        KR {{ $index + 1 }}
                                    </div>
                                    <div class="key-result-content">
                                        <h6 class="key-result-title">
                                            {{ $keyResult->title }}
                                            @php
                                                $krStatusClass = match($keyResult->status) {
                                                    'not_started' => 'not_started',
                                                    'in_progress' => 'in_progress',
                                                    'completed' => 'completed',
                                                    default => 'default'
                                                };
                                            @endphp
                                            <span class="key-result-status {{ $krStatusClass }}">
                                                {{ ucfirst(str_replace('_', ' ', $keyResult->status)) }}
                                            </span>
                                        </h6>
                                        @if($keyResult->description)
                                            <p class="key-result-desc">{{ $keyResult->description }}</p>
                                        @endif
                                        <div class="progress-wrapper">
                                            <div class="progress-bar" 
                                                 role="progressbar" 
                                                 style="width: {{ $keyResult->progress ?? 0 }}%"
                                                 aria-valuenow="{{ $keyResult->progress ?? 0 }}" 
                                                 aria-valuemin="0" 
                                                 aria-valuemax="100">
                                            </div>
                                        </div>
                                        <small class="progress-text">{{ $keyResult->progress ?? 0 }}% complete</small>
                                    </div>
                                </div>
                            @endforeach
                        </div>
                    @else
                        <div class="empty-key-results">
                            <i class="bi bi-key empty-key-results-icon"></i>
                            <h6 class="empty-key-results-title">Chưa có Key Results</h6>
                            <p class="empty-key-results-text">Thêm key results để theo dõi tiến độ mục tiêu này.</p>
                        </div>
                    @endif
                </div>

                <div class="d-flex justify-content-start">
                    <a href="{{ route('key_results.create', $objective->obj_id) }}" class="add-kr-button">
                        <i class="bi bi-plus-circle"></i> Thêm KR
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection