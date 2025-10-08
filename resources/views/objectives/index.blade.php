@extends('layouts.app')

@section('content')
<div class="space-y-8 container mx-auto px-4 lg:px-8">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-[#1b1b18] dark:text-[#EDEDEC]">OKR Dashboard</h1>
        <a href="{{ route('objectives.create') }}" 
           class="bg-[#1b1b18] hover:bg-black dark:bg-[#3E3E3A] dark:hover:bg-white text-white dark:text-[#EDEDEC] dark:hover:text-[#1b1b18] px-4 py-2 rounded-lg font-medium transition-all">
            + New Objective
        </a>
    </div>

    @if($objectives->count() > 0)
        @foreach($objectives as $objective)
        <!-- Objective Card -->
        <div class="bg-white dark:bg-[#161615] rounded-xl shadow-[0px_0px_1px_0px_rgba(0,0,0,0.03),0px_1px_2px_0px_rgba(0,0,0,0.06)] border border-[#e3e3e0] dark:border-[#3E3E3A] p-6 transition-all">
            <!-- Objective Header -->
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
                <div class="flex-1">
                    <h2 class="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">{{ $objective->obj_title }}</h2>
                    <p class="text-sm text-[#706f6c] dark:text-[#A1A09A] mb-1">
                        <span class="font-medium">Owner:</span> 
                        @if($objective->user)
                            {{ $objective->user->full_name }}
                        @else
                            <span class="text-[#706f6c] dark:text-[#A1A09A]">No owner</span>
                        @endif
                    </p>
                    <p class="text-sm text-[#706f6c] dark:text-[#A1A09A] mb-1">
                        <span class="font-medium">Level:</span> 
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            @if($objective->level === 'Công ty') bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300
                            @elseif($objective->level === 'Phòng ban') bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300
                            @elseif($objective->level === 'Nhóm') bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300
                            @else bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 @endif">
                            {{ $objective->level }}
                        </span>
                    </p>
                    <p class="text-sm text-[#706f6c] dark:text-[#A1A09A] mb-1">
                        <span class="font-medium">Cycle:</span> 
                        @if($objective->cycle)
                            {{ $objective->cycle->cycle_name }}
                        @else
                            <span class="text-[#706f6c] dark:text-[#A1A09A]">No cycle</span>
                        @endif
                    </p>
                    @if($objective->department)
                    <p class="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                        <span class="font-medium">Department:</span> 
                        {{ $objective->department->d_name }}
                    </p>
                    @endif
                </div>
                
                <!-- Overall Progress -->
                <div class="text-right mt-4 lg:mt-0">
                    <div class="text-2xl font-bold text-[#1b1b18] dark:text-[#EDEDEC] mb-1">{{ number_format($objective->progress_percent, 0) }}%</div>
                    <div class="text-sm text-[#706f6c] dark:text-[#A1A09A] mb-2">Overall Progress</div>
                    <div class="w-32 bg-[#dbdbd7] dark:bg-[#3E3E3A] rounded-full h-2">
                        <div class="bg-[#1b1b18] dark:bg-[#EDEDEC] h-2 rounded-full transition-all" style="width: {{ $objective->progress_percent }}%"></div>
                    </div>
                    <div class="text-xs text-[#706f6c] dark:text-[#A1A09A] mt-1">
                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                            @if($objective->status == 'active') bg-[#1b1b18]/10 text-[#1b1b18] dark:bg-[#EDEDEC]/10 dark:text-[#EDEDEC]
                            @elseif($objective->status == 'completed') bg-[#1b1b18]/5 text-[#1b1b18] dark:bg-[#EDEDEC]/5 dark:text-[#EDEDEC]
                            @else bg-[#dbdbd7] text-[#706f6c] dark:bg-[#3E3E3A] dark:text-[#A1A09A] @endif">
                            {{ ucfirst($objective->status) }}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Key Results Section -->
            @if($objective->keyResults && $objective->keyResults->count() > 0)
                <div class="border-t border-[#e3e3e0] dark:border-[#3E3E3A] pt-6">
                    <h3 class="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-4">Key Results</h3>
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
                </div>
            @else
                <div class="border-t border-[#e3e3e0] dark:border-[#3E3E3A] pt-6">
                    <h3 class="text-lg font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-4">Key Results</h3>
                    <div class="text-center">
                        <a href="{{ route('key_results.create', $objective->objective_id) }}" 
                           class="bg-[#1b1b18] hover:bg-black dark:bg-[#3E3E3A] dark:hover:bg-white text-white dark:text-[#EDEDEC] dark:hover:text-[#1b1b18] px-4 py-2 rounded-lg font-medium transition-all">
                            + Add Key Result
                        </a>
                    </div>
                </div>
            @endif

            <!-- Actions -->
            <div class="border-t border-[#e3e3e0] dark:border-[#3E3E3A] pt-4 mt-6 flex flex-col lg:flex-row justify-between items-start lg:items-center">
                <div class="text-sm text-[#706f6c] dark:text-[#A1A09A]">
                    Created {{ $objective->created_at ? $objective->created_at->format('M d, Y') : 'N/A' }}
                </div>
                
                @php
                    $canEdit = true;
                    $canDelete = true;
                    
                    // Kiểm tra quyền chỉnh sửa/xóa dựa trên level và role
                    if ($objective->level === 'Phòng ban') {
                        if (Auth::user()->isMember()) {
                            $canEdit = false;
                            $canDelete = false;
                        } elseif (Auth::user()->isManager()) {
                            // Manager chỉ có thể chỉnh sửa OKR phòng ban của phòng ban mình
                            $canEdit = $objective->department_id === Auth::user()->department_id;
                            $canDelete = $objective->department_id === Auth::user()->department_id;
                        }
                    } elseif ($objective->level === 'Cá nhân') {
                        // OKR cá nhân chỉ có owner hoặc Admin mới được chỉnh sửa
                        if (Auth::user()->isMember()) {
                            $canEdit = $objective->user_id === Auth::user()->user_id;
                            $canDelete = $objective->user_id === Auth::user()->user_id;
                        }
                    }
                @endphp
                
                <div class="flex flex-col lg:flex-row space-y-2 lg:space-y-0 lg:space-x-2 mt-2 lg:mt-0">
                    <a href="{{ route('objectives.show', $objective->objective_id) }}" 
                       class="text-[#1b1b18] hover:text-black dark:text-[#EDEDEC] dark:hover:text-white text-sm font-medium underline underline-offset-4">View Details</a>
                    
                    @if($canEdit)
                        <a href="{{ route('objectives.edit', $objective->objective_id) }}" 
                           class="text-[#706f6c] hover:text-[#1b1b18] dark:text-[#A1A09A] dark:hover:text-[#EDEDEC] text-sm font-medium underline underline-offset-4">Edit</a>
                    @endif
                    
                    @if($canDelete)
                        <form action="{{ route('objectives.destroy', $objective->objective_id) }}" method="POST" class="inline"
                              onsubmit="return confirm('Delete this objective?')">
                            @csrf
                            @method('DELETE')
                            <button type="submit" class="text-[#f53003] hover:text-[#F61500] dark:text-[#FF4433] dark:hover:text-[#F61500] text-sm font-medium underline underline-offset-4">Delete</button>
                        </form>
                    @endif
                    
                    @if($objective->level === 'Phòng ban' && Auth::user()->isMember())
                        <span class="text-xs text-[#706f6c] dark:text-[#A1A09A] italic">
                            <i class="fas fa-info-circle"></i> Read-only
                        </span>
                    @endif
                </div>
            </div>
        </div>
        @endforeach

        <!-- Pagination -->
        @if($objectives->hasPages())
            <div class="flex justify-center mt-8">
                {{ $objectives->links() }}
            </div>
        @endif
    @else
        <!-- Empty State -->
        <div class="text-center py-16">
            <svg class="w-16 h-16 mx-auto mb-6 text-[#dbdbd7] dark:text-[#3E3E3A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <h3 class="text-xl font-semibold text-[#1b1b18] dark:text-[#EDEDEC] mb-2">No Objectives Found</h3>
            <p class="text-[#706f6c] dark:text-[#A1A09A] mb-6">Start by creating your first objective to track your goals.</p>
            <a href="{{ route('objectives.create') }}" 
               class="bg-[#1b1b18] hover:bg-black dark:bg-[#3E3E3A] dark:hover:bg-white text-white dark:text-[#EDEDEC] dark:hover:text-[#1b1b18] px-6 py-3 rounded-lg font-medium transition-all">
                Create First Objective
            </a>
        </div>
    @endif
</div>
@endsection