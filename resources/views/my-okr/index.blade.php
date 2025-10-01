@extends('layouts.my-okr')

@section('title', 'My OKR')

@section('content')
<style>
    .okr-container {
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        min-height: 100vh;
    }
    .okr-header {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 2rem;
        border-radius: 0 0 20px 20px;
        margin-bottom: 2rem;
        box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
    }
    .okr-card {
        background: white;
        border-radius: 15px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        border: 1px solid #e2e8f0;
        transition: all 0.3s ease;
    }
    .okr-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }
    .stats-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        border-left: 4px solid #3b82f6;
    }
    .progress-bar {
        background: linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%);
        border-radius: 10px;
    }
    .filter-section {
        background: white;
        border-radius: 15px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        border: 1px solid #e2e8f0;
    }
</style>

<div class="okr-container">
    <!-- Header -->
    <div class="okr-header">
        <h1 class="text-4xl font-bold mb-2">My OKR</h1>
        <p class="text-blue-100 text-lg">
            @if($currentCycle)
                Chu kỳ: {{ $currentCycle->cycle_name }} ({{ $currentQuarter['label'] }})
            @else
                {{ $message ?? 'Quý hiện tại: ' . $currentQuarter['label'] }}
            @endif
        </p>
    </div>

    @if(!empty($notifications))
        <div class="space-y-3 mb-6">
            @foreach($notifications as $note)
                <div class="p-4 rounded-md border
                    @if($note['type'] === 'warning') border-yellow-300 bg-yellow-50 text-yellow-800
                    @elseif($note['type'] === 'danger') border-red-300 bg-red-50 text-red-800
                    @else border-blue-300 bg-blue-50 text-blue-800 @endif">
                    <div class="flex items-start justify-between">
                        <div>
                            <div class="font-semibold">{{ $note['title'] }}</div>
                            <div class="text-sm">{{ $note['message'] }}</div>
                            @if(!empty($note['deadline']))
                                <div class="text-xs mt-1 opacity-80">Hạn: {{ $note['deadline'] }}</div>
                            @endif
                        </div>
                        @if(isset($note['progress']))
                            <div class="text-right">
                                <div class="text-sm font-medium">{{ $note['progress'] }}%</div>
                            </div>
                        @endif
                    </div>
                </div>
            @endforeach
        </div>
    @endif

    @if($currentCycle)
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="stats-card p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-blue-100 rounded-xl">
                        <svg class="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">Tổng số OKR</p>
                        <p class="text-3xl font-bold text-blue-600">{{ $stats['total'] }}</p>
                    </div>
                </div>
            </div>

            <div class="stats-card p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-green-100 rounded-xl">
                        <svg class="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">Hoàn thành</p>
                        <p class="text-3xl font-bold text-green-600">{{ $stats['completed'] }}</p>
                    </div>
                </div>
            </div>

            <div class="stats-card p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-yellow-100 rounded-xl">
                        <svg class="w-7 h-7 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">Đang thực hiện</p>
                        <p class="text-3xl font-bold text-yellow-600">{{ $stats['in_progress'] }}</p>
                    </div>
                </div>
            </div>

            <div class="stats-card p-6">
                <div class="flex items-center">
                    <div class="p-3 bg-purple-100 rounded-xl">
                        <svg class="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
                        </svg>
                    </div>
                    <div class="ml-4">
                        <p class="text-sm font-medium text-gray-600">Tiến độ TB</p>
                        <p class="text-3xl font-bold text-purple-600">{{ $stats['average_progress'] }}%</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Filters and Sort -->
        <div class="filter-section p-6 mb-8">
            <form method="GET" class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <!-- Status Filter -->
                <div>
                    <label for="status" class="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                    <select name="status" id="status" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Tất cả</option>
                        <option value="not_started" {{ $filters['status'] == 'not_started' ? 'selected' : '' }}>Chưa bắt đầu</option>
                        <option value="in_progress" {{ $filters['status'] == 'in_progress' ? 'selected' : '' }}>Đang thực hiện</option>
                        <option value="completed" {{ $filters['status'] == 'completed' ? 'selected' : '' }}>Hoàn thành</option>
                    </select>
                </div>

                <!-- Progress Filter -->
                <div>
                    <label for="progress" class="block text-sm font-medium text-gray-700 mb-2">Tiến độ</label>
                    <select name="progress" id="progress" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Tất cả</option>
                        <option value="low" {{ $filters['progress'] == 'low' ? 'selected' : '' }}>Thấp (0-25%)</option>
                        <option value="medium" {{ $filters['progress'] == 'medium' ? 'selected' : '' }}>Trung bình (26-75%)</option>
                        <option value="high" {{ $filters['progress'] == 'high' ? 'selected' : '' }}>Cao (76-100%)</option>
                    </select>
                </div>

                <!-- Sort By -->
                <div>
                    <label for="sort" class="block text-sm font-medium text-gray-700 mb-2">Sắp xếp theo</label>
                    <select name="sort" id="sort" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="created_at" {{ $filters['sort'] == 'created_at' ? 'selected' : '' }}>Ngày tạo</option>
                        <option value="progress" {{ $filters['sort'] == 'progress' ? 'selected' : '' }}>Tiến độ</option>
                        <option value="title" {{ $filters['sort'] == 'title' ? 'selected' : '' }}>Tiêu đề</option>
                        <option value="status" {{ $filters['sort'] == 'status' ? 'selected' : '' }}>Trạng thái</option>
                    </select>
                </div>

                <!-- Sort Direction -->
                <div>
                    <label for="direction" class="block text-sm font-medium text-gray-700 mb-2">Thứ tự</label>
                    <select name="direction" id="direction" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="desc" {{ $filters['direction'] == 'desc' ? 'selected' : '' }}>Giảm dần</option>
                        <option value="asc" {{ $filters['direction'] == 'asc' ? 'selected' : '' }}>Tăng dần</option>
                    </select>
                </div>

                <div class="md:col-span-4 flex justify-end space-x-4">
                    <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        Lọc
                    </button>
                    <a href="{{ route('my-okr.index') }}" class="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                        Xóa bộ lọc
                    </a>
                </div>
            </form>
        </div>

        <!-- OKR List -->
        @if($objectives->count() > 0)
            <div class="space-y-6">
                @foreach($objectives as $objective)
                    <div class="okr-card p-6">
                        <!-- Objective Header -->
                        <div class="flex items-start justify-between mb-4">
                            <div class="flex-1">
                                <h3 class="text-xl font-semibold text-gray-900 mb-2">{{ $objective->obj_title }}</h3>
                                @if($objective->description)
                                    <p class="text-gray-600 mb-3">{{ $objective->description }}</p>
                                @endif
                            </div>
                            <div class="flex items-center space-x-4">
                                <!-- Status Badge -->
                                <span class="px-3 py-1 rounded-full text-sm font-medium
                                    @if($objective->status == 'completed') bg-green-100 text-green-800
                                    @elseif($objective->status == 'in_progress') bg-yellow-100 text-yellow-800
                                    @else bg-gray-100 text-gray-800
                                    @endif">
                                    @switch($objective->status)
                                        @case('completed') Hoàn thành @break
                                        @case('in_progress') Đang thực hiện @break
                                        @default Chưa bắt đầu
                                    @endswitch
                                </span>
                                
                                <!-- Progress -->
                                <div class="text-right">
                                    <div class="text-2xl font-bold text-blue-600">{{ $objective->progress_percent }}%</div>
                                    <div class="text-sm text-gray-500">Tiến độ</div>
                                </div>
                            </div>
                        </div>

                        <!-- Progress Bar -->
                        <div class="mb-4">
                            <div class="w-full bg-gray-200 rounded-full h-3">
                                <div class="progress-bar h-3 rounded-full transition-all duration-300" 
                                     style="width: {{ $objective->progress_percent }}%"></div>
                            </div>
                        </div>

                        <!-- Key Results -->
                        @if($objective->keyResults->count() > 0)
                            <div class="border-t pt-4">
                                <h4 class="text-lg font-medium text-gray-900 mb-3">Key Results</h4>
                                <div class="space-y-3">
                                    @foreach($objective->keyResults as $keyResult)
                                        <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div class="flex-1">
                                                <p class="font-medium text-gray-900">{{ $keyResult->kr_title }}</p>
                                                <p class="text-sm text-gray-600">
                                                    {{ $keyResult->current_value }}/{{ $keyResult->target_value }} {{ $keyResult->unit }}
                                                </p>
                                            </div>
                                            <div class="flex items-center space-x-3">
                                                <div class="text-right">
                                                    <div class="text-sm font-medium text-gray-900">{{ $keyResult->progress_percent }}%</div>
                                                </div>
                                                <div class="w-16 bg-gray-200 rounded-full h-2">
                                                    <div class="progress-bar h-2 rounded-full" 
                                                         style="width: {{ $keyResult->progress_percent }}%"></div>
                                                </div>
                                            </div>
                                        </div>
                                    @endforeach
                                </div>
                            </div>
                        @else
                            <div class="border-t pt-4">
                                <p class="text-gray-500 italic">Chưa có Key Results nào được định nghĩa.</p>
                            </div>
                        @endif

                        <!-- Objective Footer -->
                        <div class="border-t pt-4 mt-4 flex justify-between items-center text-sm text-gray-500">
                            <span>Ngày tạo: {{ $objective->created_at->format('d/m/Y') }}</span>
                            <span>Cập nhật: {{ $objective->updated_at->format('d/m/Y H:i') }}</span>
                        </div>
                    </div>
                @endforeach
            </div>
        @else
            <!-- Empty State -->
            <div class="text-center py-12">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Không có OKR nào</h3>
                <p class="mt-1 text-sm text-gray-500">
                    Bạn chưa tạo OKR nào trong chu kỳ hiện tại.
                </p>
                <div class="mt-6">
                    <a href="{{ route('objectives.create') }}" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                        <svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                        </svg>
                        Tạo OKR mới
                    </a>
                </div>
            </div>
        @endif
    @else
        <!-- No Active Cycle -->
        <div class="text-center py-12">
            <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="mt-2 text-sm font-medium text-gray-900">Không có chu kỳ hoạt động</h3>
            <p class="mt-1 text-sm text-gray-500">
                {{ $message }}
            </p>
        </div>
    @endif
</div>
@endsection
