@extends('layouts.app')

@section('title', 'Thêm Key Result')
@section('content')
<div class="container-kr">

    <h4 class="mb-3">Thêm Key Result</h4>

    @if ($errors->any())
        <div class="alert-danger">
            <ul>
                @foreach ($errors->all() as $e)
                    <li>{{ $e }}</li>
                @endforeach
            </ul>
        </div>
    @endif

    <form action="{{ route('key_results.store', $objective->obj_id) }}" method="POST">
        @csrf

        <div class="form-group">
            <label>Tên Key Result</label>
            <input type="text" name="kr_title" class="form-control" required>
        </div>

        <div class="form-group">
            <label>Mô tả</label>
            <textarea name="kr_desc" class="form-control" rows="4"></textarea>
        </div>

        <div class="form-group">
            <label>Loại chỉ số</label>
            <select name="metric_type" class="form-control" required>
                <option value="number">Số lượng</option>
                <option value="percent">Phần trăm</option>
                <option value="completion">Hoàn thành</option>
                <option value="currency">Tiền tệ</option>
                <option value="hours">Giờ</option>
                <option value="items">Sản phẩm</option>
                <option value="score">Điểm</option>
            </select>
        </div>

        <div class="form-group">
            <label>Đơn vị</label>
            <input type="text" name="unit" class="form-control">
        </div>

        <div class="form-group">
            <label>Giá trị mục tiêu</label>
            <input type="number" step="0.01" name="target_value" class="form-control" required>
        </div>

        <div class="form-group">
            <label>Giá trị hiện tại</label>
            <input type="number" step="0.01" name="current_value" class="form-control">
        </div>

        <div class="form-group">
            <label>Trạng thái</label>
            <input type="text" name="status" class="form-control">
        </div>

        <button type="submit" class="btn-success">Lưu</button>
        <a href="{{ session('back_url', url()->previous()) }}" class="btn-secondary">Hủy</a>
    </form>
</div>

<style>
.container-kr {
    max-width: 700px;
    margin: auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

h4 {
    margin-bottom: 20px;
    color: #2c3e50;
}

.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #333;
}

.form-control {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    box-sizing: border-box;
    transition: border-color 0.3s ease;
}

.form-control:focus {
    border-color: #3498db;
    outline: none;
}

.btn-success, .btn-secondary {
    display: inline-block;
    padding: 8px 15px;
    margin-right: 10px;
    border-radius: 5px;
    text-decoration: none;
    color: white;
    transition: background-color 0.3s ease;
    border: none;
    cursor: pointer;
}

.btn-success {
    background-color: #28a745;
}

.btn-success:hover {
    background-color: #218838;
}

.btn-secondary {
    background-color: #6c757d;
}

.btn-secondary:hover {
    background-color: #5a6268;
}

.alert-danger {
    background-color: #f8d7da;
    color: #721c24;
    padding: 10px 15px;
    border-left: 5px solid #dc3545;
    border-radius: 5px;
    margin-bottom: 15px;
}
</style>
@endsection