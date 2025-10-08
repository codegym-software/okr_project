@extends('layouts.app')

@section('title', 'Edit Objective - OKR System')

@section('content')
<div class="space-y-8 container mx-auto px-4 lg:px-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
        <div>
            <h1 class="text-3xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">Chỉnh sửa Objective</h1>
            <p class="text-[#706f6c] dark:text-[#A1A09A] mt-2">{{ $objective->obj_title }}</p>
        </div>
        <a href="{{ route('objectives.show', $objective->objective_id) }}" 
           class="text-[#706f6c] hover:text-[#1b1b18] dark:text-[#A1A09A] dark:hover:text-[#EDEDEC] text-sm font-medium underline underline-offset-4">
            ← Quay lại chi tiết
        </a>
    </div>

    <!-- Form -->
    <div class="bg-white dark:bg-[#161615] rounded-xl shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] border border-[#e3e3e0] dark:border-[#3E3E3A] p-8">
        <form action="{{ route('objectives.update', $objective->objective_id) }}" method="POST">
            @csrf
            @method('PUT')
            
            <!-- Objective Section -->
            <div class="mb-8">
                <h2 class="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-6">Objective (Mục tiêu)</h2>
                
                <div class="space-y-6">
                    <!-- Title -->
                    <div class="input-group">
                        <label for="obj_title" class="form-label">Tiêu đề Objective <span class="required-asterisk">*</span></label>
                        <input type="text" id="obj_title" name="obj_title" class="form-input" 
                               value="{{ old('obj_title', $objective->obj_title) }}" required maxlength="255">
                        @error('obj_title')
                            <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <!-- Description -->
                    <div class="input-group">
                        <label for="description" class="form-label">Mô tả</label>
                        <textarea id="description" name="description" class="form-textarea" 
                                  rows="4" maxlength="1000">{{ old('description', $objective->description) }}</textarea>
                        @error('description')
                            <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <!-- Status -->
                    <div class="input-group">
                        <label for="status" class="form-label">Trạng thái <span class="required-asterisk">*</span></label>
                        <div class="relative">
                            <select id="status" name="status" class="form-select" required>
                                <option value="draft" {{ old('status', $objective->status) == 'draft' ? 'selected' : '' }}>Draft</option>
                                <option value="active" {{ old('status', $objective->status) == 'active' ? 'selected' : '' }}>Active</option>
                                <option value="completed" {{ old('status', $objective->status) == 'completed' ? 'selected' : '' }}>Completed</option>
                            </select>
                        </div>
                        @error('status')
                            <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <!-- Progress -->
                    <div class="input-group">
                        <label for="progress_percent" class="form-label">Tiến độ (%)</label>
                        <input type="number" id="progress_percent" name="progress_percent" class="form-input" 
                               value="{{ old('progress_percent', $objective->progress_percent) }}" min="0" max="100" step="0.01">
                        @error('progress_percent')
                            <p class="text-red-500 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>
                </div>
            </div>

            <!-- Key Results Section -->
            <div class="mb-8">
                <h2 class="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-6">Key Results (Kết quả then chốt)</h2>
                
                <div class="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-blue-500 mt-0.5 mr-3"></i>
                        <div>
                            <p class="font-medium mb-1">Thông tin Key Results</p>
                            <p class="text-sm">
                                Để chỉnh sửa Key Results, vui lòng sử dụng chức năng quản lý Key Results riêng biệt.
                                Bạn có thể thêm, sửa hoặc xóa Key Results từ trang chi tiết OKR.
                            </p>
                        </div>
                    </div>
                </div>

                @if($objective->keyResults && $objective->keyResults->count() > 0)
                    <div class="space-y-4">
                        @foreach($objective->keyResults as $index => $keyResult)
                            <div class="bg-[#f8fafc] dark:bg-[#1e293b] rounded-lg p-4 border border-[#e2e8f0] dark:border-[#334155]">
                                <div class="flex justify-between items-start mb-2">
                                    <h4 class="font-medium text-[#1b1b18] dark:text-[#EDEDEC]">
                                        KR {{ $index + 1 }}: {{ $keyResult->kr_title }}
                                    </h4>
                                    <span class="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                                        {{ $keyResult->current_value }}/{{ $keyResult->target_value }} {{ $keyResult->unit }}
                                    </span>
                                </div>
                                <div class="w-full bg-[#e2e8f0] dark:bg-[#334155] rounded-full h-2 mb-2">
                                    <div class="bg-[#1b1b18] dark:bg-[#EDEDEC] h-2 rounded-full transition-all" 
                                         style="width: {{ $keyResult->progress_percent }}%"></div>
                                </div>
                                <div class="flex justify-between items-center text-xs text-[#706f6c] dark:text-[#A1A09A]">
                                    <span>{{ number_format($keyResult->progress_percent, 0) }}% Complete</span>
                                    @if($keyResult->weight > 0)
                                        <span>Weight: {{ $keyResult->weight }}%</span>
                                    @endif
                                </div>
                            </div>
                        @endforeach
                    </div>
                @else
                    <div class="text-center py-8">
                        <p class="text-[#706f6c] dark:text-[#A1A09A] mb-4">No key results yet</p>
                        <a href="{{ route('key_results.create', $objective->objective_id) }}" 
                           class="bg-[#1b1b18] hover:bg-black dark:bg-[#3E3E3A] dark:hover:bg-white text-white dark:text-[#EDEDEC] dark:hover:text-[#1b1b18] px-4 py-2 rounded-lg font-medium transition-all">
                            + Add Key Result
                        </a>
                    </div>
                @endif
            </div>

            <!-- Submit Buttons -->
            <div class="flex justify-end space-x-4 pt-6 border-t border-[#e3e3e0] dark:border-[#3E3E3A]">
                <a href="{{ route('objectives.show', $objective->objective_id) }}" 
                   class="px-6 py-2 border border-[#e3e3e0] dark:border-[#3E3E3A] text-[#706f6c] dark:text-[#A1A09A] rounded-lg hover:bg-[#f8fafc] dark:hover:bg-[#1e293b] transition-all">
                    Hủy
                </a>
                <button type="submit" class="bg-[#1b1b18] hover:bg-black dark:bg-[#3E3E3A] dark:hover:bg-white text-white dark:text-[#EDEDEC] dark:hover:text-[#1b1b18] px-6 py-2 rounded-lg font-medium transition-all">
                    Cập nhật Objective
                </button>
            </div>
        </form>
    </div>
</div>

<style>
.form-label {
    display: block;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
}

.dark .form-label {
    color: #d1d5db;
}

.form-input, .form-textarea, .form-select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.dark .form-input, .dark .form-textarea, .dark .form-select {
    background-color: #1f2937;
    border-color: #374151;
    color: #f9fafb;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.required-asterisk {
    color: #ef4444;
}

.input-group {
    margin-bottom: 1.5rem;
}
</style>
@endsection