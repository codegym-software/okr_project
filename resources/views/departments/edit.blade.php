@extends('layouts.app')

@section('content')
<div class="container">
    <h1>Chỉnh sửa phòng ban</h1>
    <form action="{{ route('departments.update', $department) }}" method="POST">
        @csrf
        @method('PUT')
        <div class="mb-3">
            <label>Tên phòng ban</label>
            <input type="text" name="d_name" class="form-control" value="{{ $department->d_name }}">
            @error('d_name') <div class="text-danger">{{ $message }}</div> @enderror
        </div>
        <div class="mb-3">
            <label>Mô tả</label>
            <textarea name="d_description" class="form-control">{{ $department->d_description }}</textarea>
            @error('d_description') <div class="text-danger">{{ $message }}</div> @enderror
        </div>
        <button type="submit" class="btn btn-success">Cập nhật</button>
        <a href="{{ route('departments.index') }}" class="btn btn-secondary">Hủy</a>
    </form>
</div>
@endsection