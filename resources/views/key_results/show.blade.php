@extends('layouts.app')

@section('title', 'Danh sách Key Results')

<!-- CSS: Bootstrap + Font Awesome -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">

@section('content')
<div class="container-kr mt-4">

    <!-- Header -->
    <div class="d-flex justify-content-between mb-3">
        <h4>Danh sách Key Results</h4>
        <a href="{{ route('key_results.create', $objective->objective_id) }}" class="btn btn-primary">
            + Thêm Key Result
        </a>
    </div>

    <!-- Toast thông báo thành công -->
    @if(session('success'))
        <div class="toast align-items-center text-bg-success border-0 position-fixed top-0 end-0 m-3" 
             role="alert" aria-live="assertive" aria-atomic="true" id="successToast">
            <div class="d-flex">
                <div class="toast-body">{{ session('success') }}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                        data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    @endif

    <!-- Table Key Results -->
    @if($keyResults->isEmpty())
        <p class="text-muted">Chưa có Key Result nào.</p>
    @else
        <table class="kr-table">
            <thead>
                <tr>
                    <th>Tên</th>
                    <th>Mục tiêu</th>
                    <th>Hiện tại</th>
                    <th>Tiến độ (%)</th>
                    <th>Trạng thái</th>
                    <th>Trọng số</th>
                    <th>Objective</th>
                    <th>Cycle</th>
                    <th>Hành động</th>
                </tr>
            </thead>
            <tbody>
                @foreach($keyResults as $kr)
                    <tr id="kr-row-{{ $kr->kr_id }}">
                        <td>{{ $kr->kr_title }}</td>
                        <td>{{ $kr->target_value }} {{ $kr->unit }}</td>
                        <td>{{ $kr->current_value ?? 0 }} {{ $kr->unit }}</td>
                        <td>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: {{ $kr->progress_percent ?? 0 }}%"></div>
                                <span>{{ number_format($kr->progress_percent ?? 0) }}%</span>
                            </div>
                        </td>
                        <td>{{ $kr->status ?? 'Chưa bắt đầu' }}</td>
                        <td>{{ $kr->weight ?? 0 }}</td>
                        <td>{{ $kr->objective->obj_title ?? 'N/A' }}</td>
                        <td>{{ $kr->cycle->cycle_name ?? 'N/A' }}</td>
                        <td>
                            <button class="btn btn-danger btn-sm btn-delete" 
                                    data-id="{{ $kr->kr_id }}" 
                                    data-objective="{{ $objective->objective_id }}">
                                <i class="fa fa-trash"></i> 
                            </button>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    @endif
</div>

<style>
.container-kr { max-width: 1200px; margin: auto; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
.kr-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
.kr-table th, .kr-table td { border: 1px solid #ddd; padding: 10px; text-align: center; color: black; }
.kr-table th { background-color: #f8f9fa; font-weight: 600; text-transform: uppercase; }
.kr-table tr:nth-child(even) { background-color: #f4f4f4; }
.kr-table tr:hover { background-color: #d1ecf1; transition: background-color 0.3s ease; }
.btn-primary { background-color: #3498db; color: white; padding: 8px 15px; border-radius: 5px; transition: 0.3s; }
.btn-primary:hover { background-color: #2980b9; }
.progress-bar { position: relative; background: #eee; border-radius: 10px; height: 20px; width: 100%; overflow: hidden; }
.progress-fill { background-color: #3498db; height: 100%; text-align: right; line-height: 20px; color: white; border-radius: 10px 0 0 10px; transition: width 0.5s ease; }
.progress-bar span { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: 12px; color: black; }
.toast { z-index: 1055; }
</style>
@endsection

@push('scripts')
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const toastEl = document.getElementById('successToast');
    if(toastEl){
        new bootstrap.Toast(toastEl, { delay: 3000 }).show();
    }

    const tbody = document.querySelector('.kr-table tbody');
    if(tbody){
        tbody.addEventListener('click', function(e){
            const btn = e.target.closest('.btn-delete');
            if(!btn) return;
            if(!confirm("Bạn có chắc chắn muốn xóa Key Result này?")) return;

            const krId = btn.getAttribute('data-id');
            const objectiveId = btn.getAttribute('data-objective');

            fetch(`/objectives/${objectiveId}/key-results/${krId}`, {
                method: 'DELETE',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': '{{ csrf_token() }}',
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .then(async res => {
                const text = await res.text();
                try {
                    return JSON.parse(text);
                } catch(_){
                    return { success: false, message: text || 'Không thể xóa. Lỗi máy chủ.' };
                }
            })
            .then(data => {
                if(data.success){
                    const row = document.getElementById(`kr-row-${krId}`);
                    if(row) row.remove();

                    const toastHtml = `
                        <div class="toast align-items-center text-bg-success border-0 position-fixed top-0 end-0 m-3" 
                             role="alert" aria-live="assertive" aria-atomic="true">
                            <div class="d-flex">
                                <div class="toast-body">${data.message || 'Đã xóa'}</div>
                                <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                                        data-bs-dismiss="toast" aria-label="Close"></button>
                            </div>
                        </div>`;
                    document.body.insertAdjacentHTML('beforeend', toastHtml);
                    const inserted = document.body.querySelectorAll('.toast');
                    const newest = inserted[inserted.length - 1];
                    if(newest) new bootstrap.Toast(newest, { delay: 3000 }).show();
                } else {
                    alert(data.message || 'Không thể xóa.');
                }
            })
            .catch(err => {
                console.error(err);
                alert("Lỗi: " + (err.message || err));
            });
        });
    }
});
</script>
@endpush
