@extends('layouts.app')

@section('title', 'Chi tiết Key Result')

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">

@section('content')
<div class="container mt-5">
    <div class="card shadow-lg border-0 rounded-4">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0"><i class="fa fa-flag-checkered me-2"></i> Chi tiết Key Result</h4>
            <a href="{{ route('cycles.show', $objective->cycle_id) }}" class="btn btn-light btn-sm">
                <i class="fa fa-arrow-left"></i> Quay lại
            </a>
        </div>

        <div class="card-body">
            <table class="table table-bordered mb-0">
                <tr>
                    <th style="width: 25%">Tên Key Result</th>
                    <td>{{ $keyResult->kr_title }}</td>
                </tr>
                <tr>
                    <th>Giá trị mục tiêu</th>
                    <td>{{ $keyResult->target_value }}</td>
                </tr>
                <tr>
                    <th>Giá trị hiện tại</th>
                    <td>{{ $keyResult->current_value ?? 0 }}</td>
                </tr>
                <tr>
                    <th>Đơn vị</th>
                    <td>{{ $keyResult->unit ?? '-' }}</td>
                </tr>
                <tr>
                    <th>Trạng thái</th>
                    <td>{{ ucfirst($keyResult->status ?? 'Chưa xác định') }}</td>
                </tr>
                <tr>
                    <th>Trọng số</th>
                    <td>{{ $keyResult->weight ?? 0 }}</td>
                </tr>
                <tr>
                    <th>Tiến độ (%)</th>
                    <td>
                        <div class="progress" style="height: 22px;">
                            <div class="progress-bar bg-success" 
                                 style="width: {{ $keyResult->progress_percent ?? 0 }}%">
                                {{ $keyResult->progress_percent ?? 0 }}%
                            </div>
                        </div>
                    </td>
                </tr>
                <tr>
                    <th>Objective</th>
                    <td>{{ $keyResult->objective->obj_title }}</td>
                </tr>
            </table>
        </div>
    </div>
</div>

<style>
.container {
    max-width: 800px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
.card-header {
    font-weight: 600;
    font-size: 18px;
}
th {
    background-color: #f8f9fa;
    font-weight: 600;
}
td {
    color: #212529;
}
.progress-bar {
    font-weight: 600;
    color: #fff;
}
</style>
@endsection
