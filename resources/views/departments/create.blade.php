@extends('layouts.app')

@section('content')
<div class="container mx-auto flex flex-col items-center justify-center min-h-screen">
    <h1 class="text-2xl font-bold mb-6">Tạo phòng ban mới</h1>
    <form action="{{ route('departments.store') }}" method="POST" class="main-form w-[500px]">
        @csrf
        <div class="mb-4 flex items-center gap-4">
            <label for="d_name" class="w-32 font-semibold">Tên phòng ban</label>
            <input type="text" name="d_name" id="d_name" 
                   class="form-control flex-1 rounded-full px-4 py-2 border-none focus:ring-2 focus:ring-[var(--bg-primary)]" 
                   value="{{ old('d_name') }}">
            @error('d_name') 
                <div class="text-red-500 text-sm mt-1">{{ $message }}</div> 
            @enderror
        </div>
        <div class="mb-4 flex items-start gap-4">
            <label for="d_description" class="w-32 font-semibold">Mô tả</label>
            <textarea name="d_description" id="d_description" 
                      class="form-control flex-1 rounded-2xl px-4 py-2 border-none focus:ring-2 focus:ring-[var(--bg-primary)] min-h-[100px]">{{ old('d_description') }}</textarea>
            @error('d_description') 
                <div class="text-red-500 text-sm mt-1">{{ $message }}</div> 
            @enderror
        </div>
        <div class="flex justify-end gap-4">
            <button type="submit" class="btn btn-primary px-6 py-2 rounded-full">Lưu</button>
            <a href="{{ route('departments.index') }}" class="btn btn-secondary px-6 py-2 rounded-full">Hủy</a>
        </div>
    </form>
</div>
@endsection