@extends('layouts.app')

@section('title', 'Objective Details - CodeGym OKR')

@section('content')
<style>
/* ------------------------------------------------------------------
   Objective Show – custom styles (no Bootstrap)
   ------------------------------------------------------------------ */

/* Main wrapper – replaces .row */
.objective-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Column – replaces .col-md-8 */
.objective-column {
    flex: 0 0 66.6667%;
    max-width: 66.6667%;
    padding: 0 15px;
}
@media (max-width: 767px) {
    .objective-column {
        flex: 0 0 100%;
        max-width: 100%;
    }
}

/* Card – replaces .card */
.objective-card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    margin-bottom: 1.5rem;
}
.dark .objective-card {
    background: #161615;
    border-color: #374151;
}

/* Card header – replaces .card-header.d-flex.justify-content-between.align-items-center */
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

/* Objective title row – replaces .row.mb-4 */
.objective-title-row {
    display: flex;
    flex-wrap: wrap;
    margin: 0 -15px;
    margin-bottom: 1.5rem;
}

/* Objective title column – replaces .col-md-8 */
.objective-title-column {
    flex: 0 0 66.6667%;
    max-width: 66.6667%;
    padding: 0 15px;
}
@media (max-width: 767px) {
    .objective-title-column {
        flex: 0 0 100%;
        max-width: 100%;
    }
}

/* Objective title – replaces h2.mb-3 */
.objective-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
    margin-bottom: 0.75rem;
}
.dark .objective-title {
    color: #e9ecef;
}

/* Description section – replaces .mb-4 */
.description-section {
    margin-bottom: 1.5rem;
}

/* Description subtitle – replaces h6 */
.description-subtitle {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
}
.dark .description-subtitle {
    color: #d1d5db;
}

/* Description text – replaces .text-muted */
.description-text {
    color: #6b7280;
    margin: 0;
}
.dark .description-text {
    color: #9ca3af;
}

/* Status column – replaces .col-md-4.text-end */
.status-column {
    flex: 0 0 33.3333%;
    max-width: 33.3333%;
    padding: 0 15px;
    text-align: right;
}
@media (max-width: 767px) {
    .status-column {
        flex: 0 0 100%;
        max-width: 100%;
        text-align: left;
        margin-top: 1rem;
    }
}

/* Status badge – replaces .badge and dynamic status classes */
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

/* Key results section – replaces .mb-4 */
.key-results-section {
    margin-bottom: 1.5rem;
}

/* Key results title – replaces h5 */
.key-results-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.75rem;
}
.dark .key-results-title {
    color: #d1d5db;
}

/* Key results list – replaces .list-group */
.key-results-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

/* Key result item – replaces .list-group-item */
.key-result-item {
    background: #f8f9fa;
    border: 1px solid #e5e7eb;
    border-radius: 0.25rem;
    padding: 1rem;
}
.dark .key-result-item {
    background: #1f2937;
    border-color: #4b5563;
}

/* Key result flex – replaces .d-flex.w-100.justify-content-between */
.key-result-flex {
    display: flex;
    justify-content: space-between;
    width: 100%;
}

/* Key result title – replaces h6.mb-1 */
.key-result-title {
    font-size: 1rem;
    font-weight: 500;
    color: #111827;
    margin-bottom: 0.25rem;
}
.dark .key-result-title {
    color: #e9ecef;
}

/* Key result badge – replaces .badge.bg-light.text-dark */
.key-result-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    background: #e5e7eb;
    color: #111827;
    border-radius: 0.25rem;
    margin-right: 0.5rem;
}
.dark .key-result-badge {
    background: #4b5563;
    color: #e5e7eb;
}

/* Key result status – replaces .badge and dynamic KR status classes */
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

/* Key result description – replaces .mb-1 */
.key-result-description {
    margin-bottom: 0.25rem;
    color: #374151;
}
.dark .key-result-description {
    color: #d1d5db;
}

/* Progress bar wrapper – replaces .progress.mt-2 */
.progress-wrapper {
    height: 10px;
    background: #e5e7eb;
    border-radius: 0.25rem;
    overflow: hidden;
    margin-top: 0.5rem;
}
.dark .progress-wrapper {
    background: #4b5563;
}

/* Progress bar – replaces .progress-bar */
.progress-bar {
    height: 100%;
    background: #2563eb;
    transition: width 0.3s ease;
}
.dark .progress-bar {
    background: #60a5fa;
}

/* Progress text – replaces .text-muted */
.progress-text {
    display: block;
    font-size: 0.75rem;
    color: #6b7280;
}
.dark .progress-text {
    color: #9ca3af;
}

/* Empty key results – replaces .text-center.py-4 */
.empty-key-results {
    text-align: center;
    padding: 1.5rem 0;
}

/* Empty key results icon – replaces .display-1.text-muted */
.empty-key-results-icon {
    font-size: 4rem;
    color: #6b7280;
}
.dark .empty-key-results-icon {
    color: #9ca3af;
}

/* Empty key results title – replaces h6.mt-3 */
.empty-key-results-title {
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    margin-top: 0.75rem;
}
.dark .empty-key-results-title {
    color: #d1d5db;
}

/* Empty key results text – replaces .text-muted */
.empty-key-results-text {
    color: #6b7280;
    margin: 0;
}
.dark .empty-key-results-text {
    color: #9ca3af;
}

/* Add KR button – replaces .btn.btn-primary */
.add-kr-button {
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
.add-kr-button:hover {
    background: #1d4ed8;
}
.dark .add-kr-button {
    background: #1e40af;
}
.dark .add-kr-button:hover {
    background: #1e3a8a;
}

/* Icon styles for Bootstrap Icons (bi) */
.bi {
    margin-right: 0.5rem;
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
                <h3 class="card-header-title"><i class="bi bi-eye"></i> Objective Details</h3>
            </div>
            <div class="card-body">
                <div class="objective-title-row">
                    <div class="objective-title-column">
                        <h2 class="objective-title">{{ $objective->title }}</h2>
                        @if($objective->description)
                            <div class="description-section">
                                <h6 class="description-subtitle"><i class="bi bi-text-paragraph"></i> Description</h6>
                                <p class="description-text">{{ $objective->description }}</p>
                            </div>
                        @endif
                    </div>
                    <div class="status-column">
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
                </div>

                <!-- Key Results Section -->
                <div class="key-results-section">
                    <h5 class="key-results-title"><i class="bi bi-key"></i> Key Results</h5>
                    @if($objective->keyResults->count() > 0)
                        <div class="key-results-list">
                            @foreach($objective->keyResults as $index => $keyResult)
                                <div class="key-result-item">
                                    <div class="key-result-flex">
                                        <h6 class="key-result-title">
                                            <span class="key-result-badge">KR {{ $index + 1 }}</span>
                                            {{ $keyResult->title }}
                                        </h6>
                                        <small>
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
                                        </small>
                                    </div>
                                    @if($keyResult->description)
                                        <p class="key-result-description">{{ $keyResult->description }}</p>
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
                            @endforeach
                        </div>
                    @else
                        <div class="empty-key-results">
                            <i class="bi bi-key empty-key-results-icon"></i>
                            <h6 class="empty-key-results-title">No Key Results Yet</h6>
                            <p class="empty-key-results-text">Add key results to track your progress towards this objective.</p>
                        </div>
                    @endif
                </div>

                <div class="d-flex justify-content-start">
                    <a href="{{ route('key_results.create', $objective->objective_id) }}" class="add-kr-button">
                        + Thêm KR
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection