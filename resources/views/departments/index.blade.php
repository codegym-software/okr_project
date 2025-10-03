@extends('layouts.app')

@section('content')
<div class="container mx-auto flex flex-col items-center min-h-screen px-4">
    <div class="cycle-title flex justify-between items-center w-full max-w-4xl mb-12">
        <h1 class="text-4xl font-bold">Danh sách phòng ban</h1>
        <a href="{{ route('departments.create') }}" 
           class="btn btn-primary px-6 py-3 rounded-full text-lg font-semibold text-center">Tạo mới</a>
    </div>
    @if(session('success'))
        <div class="bg-green-100 text-green-700 p-4 rounded-lg mb-6 w-full max-w-4xl">
            {{ session('success') }}
        </div>
    @endif
    <div class="w-full max-w-4xl overflow-x-auto">
        <table class="w-full table-auto border-collapse border-2 border-gray-600 table-custom">
            <thead>
                <tr class="bg-gray-300">
                    <th class="border-2 border-gray-600 px-4 py-3 text-left font-bold text-gray-900">Tên phòng ban</th>
                    <th class="border-2 border-gray-600 px-4 py-3 text-left font-bold text-gray-900 max-w-[300px]">Mô tả</th>
                    <th class="border-2 border-gray-600 px-4 py-3 text-left font-bold text-gray-900">Hành động</th>
                </tr>
            </thead>
            <tbody>
                @foreach($departments as $department)
                <tr>
                    <td class="border-2 border-gray-600 px-4 py-3">{{ $department->d_name }}</td>
                    <td class="border-2 border-gray-600 px-4 py-3 max-w-[300px] truncate">{{ $department->d_description }}</td>
                    <td class="border-2 border-gray-600 px-4 py-3 flex flex-row">
                        <a href="{{ route('departments.show', $department) }}" 
                           class="btn btn-action btn-action-view px-4 py-2 rounded-lg text-sm font-semibold">Xem</a>
                        <a href="{{ route('departments.edit', $department) }}" 
                           class="btn btn-action btn-action-edit px-4 py-2 rounded-lg text-sm font-semibold">Sửa</a>
                        <form action="{{ route('departments.destroy', $department) }}" method="POST" class="inline">
                            @csrf
                            @method('DELETE')
                            <button type="submit" 
                                    class="btn btn-action btn-action-delete px-4 py-2 rounded-lg text-sm font-semibold"
                                    onclick="return confirm('Xác nhận xóa?')">Xóa</button>
                        </form>
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</div>
@endsection