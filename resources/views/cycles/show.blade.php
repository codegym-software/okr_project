@extends('layouts.app')

@section('content')
<style>
/* ------------------------------------------------------------------
   Cycle Show – custom styles (no Tailwind)
   ------------------------------------------------------------------ */

/* Main wrapper – replaces .container */
.cycle-container {
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Page title */
.cycle-title {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 1rem;
    color: #1a1a1a;
}

/* Simple inline styling for meta info */
.cycle-date,
.cycle-status,
.cycle-desc {
    display: inline-block;
    margin-right: 0.5rem;
}

/* Add-objective button */
.btn-add-objective {
    display: inline-block;
    padding: 0.5rem 1rem;
    background-color: #007bff;          /* primary blue */
    color: #fff;
    text-decoration: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    margin-top: 1rem;
    transition: background-color 0.2s ease;
}
.btn-add-objective:hover {
    background-color: #0056b3;
}

/* Objectives list wrapper */
.objectives-wrapper {
    margin-top: 2rem;
}

/* Individual objective card */
.objective-card {
    background: #ffffff;
    border-radius: 0.75rem;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    padding: 1.5rem;
    margin-bottom: 1rem;
}
.dark .objective-card {
    background: #161615;   /* dark mode background – adjust selector as needed */
}

/* Objective title inside card */
.objective-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: #212529;
}
.dark .objective-title { color: #e9ecef; }

/* Link inside card */
.objective-link {
    color: #007bff;
    text-decoration: underline;
    font-size: 0.95rem;
}
.objective-link:hover {
    color: #0056b3;
}

/* Empty-state message */
.objectives-empty {
    text-align: center;
    color: #6c757d;
    font-style: italic;
    margin-top: 1.5rem;
}

/* ------------------------------------------------------------------
   Dark-mode support (optional)
   ------------------------------------------------------------------ */
@media (prefers-color-scheme: dark) {
    /* If you use a body class like .dark, adjust selectors accordingly */
    body.dark .cycle-title { color: #e9ecef; }
    body.dark .cycle-date,
    body.dark .cycle-status,
    body.dark .cycle-desc { color: #adb5bd; }
}
</style>

<div class="cycle-container">
    <h1 class="cycle-title">{{ $cycle->cycle_name }}</h1>
    <p><strong>Ngày bắt đầu:</strong> <span class="cycle-date">{{ $cycle->start_date }}</span></p>
    <p><strong>Ngày kết thúc:</strong> <span class="cycle-date">{{ $cycle->end_date }}</span></p>
    <p><strong>Trạng thái:</strong> <span class="cycle-status">{{ $cycle->status }}</span></p>
    <p><strong>Mô tả:</strong> <span class="cycle-desc">{{ $cycle->description ?? 'Không có mô tả' }}</span></p>

    <a href="{{ route('objectives.create', ['cycle_id' => $cycle->cycle_id]) }}" 
       class="btn-add-objective">Thêm Obj</a>

    <!-- Danh sách Objectives -->
    <div id="objectives-list" class="objectives-wrapper">
        @if($objectives->count() > 0)
            @foreach($objectives as $objective)
                <div class="objective-card">
                    <h2 class="objective-title">{{ $objective->obj_title }}</h2>
                    <a href="{{ route('objectives.show', $objective->objective_id) }}" class="objective-link">View Details</a>
                </div>
            @endforeach
        @else
            <p class="objectives-empty">No objectives found for this cycle.</p>
        @endif
    </div>
</div>
@endsection