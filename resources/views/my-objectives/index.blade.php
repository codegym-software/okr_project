@extends('layouts.app')

@section('content')
    <div class="content-container">
        <div class="header">
            <h1>Danh Sách OKR Cấp Phòng Ban</h1>
            @if (Auth::user()->role->role_name === 'Admin' || Auth::user()->role->role_name === 'Manager')
                <a href="{{ route('my-objectives.create') }}">Tạo OKR Mới</a>
            @endif
        </div>

        @if (session('success'))
            <div class="success-alert" role="alert">
                {{ session('success') }}
            </div>
        @endif

        @if (session('errors'))
            <div class="error-alert" role="alert">
                <ul>
                    @foreach (session('errors')->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        {{-- <div class="debug-info">
            <p><strong>User ID:</strong> {{ Auth::user()->id }}</p>
            <p><strong>Department ID:</strong> {{ Auth::user()->department_id }}</p>
            <p><strong>Role:</strong> {{ Auth::user()->role->role_name }}</p>
            <p><strong>Objectives Type:</strong> {{ get_class($objectives) }}</p>
            <p><strong>Objectives Count:</strong> {{ is_countable($objectives) ? count($objectives) : 'Not countable' }}</p>
        </div> --}}

        <div class="table-container">
            @if (empty($objectives) || (is_countable($objectives) && count($objectives) === 0))
                <div class="empty-message">Không có OKR nào để hiển thị.</div>
            @else
                <table>
                    <thead>
                        <tr>
                            <th>Tiêu đề</th>
                            <th>Chu kỳ</th>
                            <th>Trạng thái</th>
                            <th>Tiến độ (%)</th>
                            <th>Phòng ban</th>
                            <th>Key Result cấp công ty</th>
                            <th>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($objectives as $objective)
                            <tr>
                                <td colspan="7">
                                    <details>
                                        <summary>
                                            <div class="summary-row">
                                                <span>{{ $objective->obj_title }}</span>
                                                <span>{{ $objective->cycle->cycle_name ?? 'Chưa có' }}</span>
                                                <span class="{{ $objective->status }}">
                                                    {{ ucfirst($objective->status) }}
                                                </span>
                                                <span>{{ $objective->progress_percent }}%</span>
                                                <span>{{ $objective->department->d_name ?? 'Chưa có' }}</span>
                                                <span>{{ $objective->parentKeyResult->kr_title ?? 'Không liên kết' }}</span>
                                                <span>
                                                    @if (Auth::user()->role->role_name === 'Admin' || (Auth::user()->role->role_name === 'Manager' && $objective->department_id === Auth::user()->department_id))
                                                        <a href="{{ route('my-objectives.edit', $objective->objective_id) }}">Sửa</a>
                                                        <form action="{{ route('my-objectives.destroy', $objective->objective_id) }}" method="POST" style="display: inline;">
                                                            @csrf
                                                            @method('DELETE')
                                                            <button type="submit" onclick="return confirm('Bạn có chắc muốn xóa?')">Xóa</button>
                                                        </form>
                                                        <a href="{{ route('my-key-results.create', $objective->objective_id) }}" style="margin-left: 1rem;">Tạo KR</a>
                                                    @endif
                                                </span>
                                            </div>
                                        </summary>
                                        @if ($objective->keyResults->isNotEmpty())
                                            <div class="kr-list">
                                                <table class="kr-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Tiêu đề KR</th>
                                                            <th>Mục tiêu</th>
                                                            <th>Giá trị hiện tại</th>
                                                            <th>Đơn vị</th>
                                                            <th>Trạng thái</th>
                                                            <th>Trọng số</th>
                                                            <th>Tiến độ</th>
                                                            <th>Hành động</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        @foreach ($objective->keyResults as $kr)
                                                            <tr>
                                                                <td>{{ $kr->kr_title }}</td>
                                                                <td>{{ $kr->target_value }}</td>
                                                                <td>{{ $kr->current_value }}</td>
                                                                <td>{{ $kr->unit }}</td>
                                                                <td>{{ ucfirst($kr->status) }}</td>
                                                                <td>{{ $kr->weight }}%</td>
                                                                <td>{{ $kr->progress_percent }}%</td>
                                                                <td>
                                                                    @if (Auth::user()->role->role_name === 'Admin' || (Auth::user()->role->role_name === 'Manager' && $objective->department_id === Auth::user()->department_id))
                                                                        <a href="{{ route('my-key-results.edit', [$objective->objective_id, $kr->kr_id]) }}">Sửa</a>
                                                                        <form action="{{ route('my-key-results.destroy', [$objective->objective_id, $kr->kr_id]) }}" method="POST" style="display: inline;">
                                                                            @csrf
                                                                            @method('DELETE')
                                                                            <button type="submit" onclick="return confirm('Bạn có chắc muốn xóa?')">Xóa</button>
                                                                        </form>
                                                                    @endif
                                                                </td>
                                                            </tr>
                                                        @endforeach
                                                    </tbody>
                                                </table>
                                            </div>
                                        @else
                                            <div class="empty-kr">Không có Key Result cho Objective này.</div>
                                        @endif
                                        @if ($objective->parentKeyResult)
                                            <div class="parent-key-result-details">
                                                <h4>Key Result cấp công ty liên kết: {{ $objective->parentKeyResult->kr_title }}</h4>
                                                <p><strong>Mục tiêu:</strong> {{ $objective->parentKeyResult->target_value }}</p>
                                                <p><strong>Giá trị hiện tại:</strong> {{ $objective->parentKeyResult->current_value }}</p>
                                                <p><strong>Đơn vị:</strong> {{ $objective->parentKeyResult->unit }}</p>
                                                <p><strong>Trạng thái:</strong> {{ ucfirst($objective->parentKeyResult->status) }}</p>
                                                <p><strong>Trọng số:</strong> {{ $objective->parentKeyResult->weight }}%</p>
                                                <p><strong>Tiến độ:</strong> {{ $objective->parentKeyResult->progress_percent }}%</p>
                                                <h4>Objective cấp công ty: {{ $objective->parentKeyResult->objective->obj_title }}</h4>
                                                <p><strong>Mô tả:</strong> {{ $objective->parentKeyResult->objective->description ?? 'Không có' }}</p>
                                            </div>
                                        @endif
                                    </details>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            @endif
            @if ($objectives instanceof \Illuminate\Pagination\LengthAwarePaginator)
                <div class="pagination">
                    {{ $objectives->links() }}
                </div>
            @endif
        </div>
    </div>
@endsection

<style>
    .content-container {
        margin-left: auto;
        margin-right: auto;
        padding: 1.5rem;
    }

    .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
    }

    .header h1 {
        font-size: 1.5rem;
        font-weight: bold;
    }

    .header a {
        background-color: #4c51bf;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        text-decoration: none;
        transition: background-color 0.2s;
    }

    .header a:hover {
        background-color: #434190;
    }

    .success-alert {
        background-color: #f0fff4;
        border: 1px solid #68d391;
        color: #2f855a;
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
    }

    .error-alert {
        background-color: #fef2f2;
        border: 1px solid #feb2b2;
        color: #741a1a;
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
    }

    .debug-info {
        background-color: #f9fafb;
        padding: 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1.5rem;
    }

    .table-container {
        background-color: white;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        border-radius: 0.375rem;
        overflow: hidden;
    }

    .empty-message {
        padding: 1rem;
        text-align: center;
        color: #a0aec0;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    thead {
        background-color: #f7fafc;
    }

    th {
        padding: 0.75rem 1.5rem;
        text-align: left;
        font-size: 0.75rem;
        font-weight: medium;
        color: #a0aec0;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    tbody {
        background-color: white;
    }

    tr {
        border-bottom: 1px solid #edf2f7;
    }

    td {
        padding: 1rem 1.5rem;
        white-space: nowrap;
    }

    .draft {
        padding: 0.25rem 0.5rem;
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: bold;
        border-radius: 9999px;
        background-color: #fffaf0;
        color: #975a16;
    }

    .active {
        padding: 0.25rem 0.5rem;
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: bold;
        border-radius: 9999px;
        background-color: #ebf4ff;
        color: #2b6cb0;
    }

    .completed {
        padding: 0.25rem 0.5rem;
        display: inline-flex;
        font-size: 0.75rem;
        font-weight: bold;
        border-radius: 9999px;
        background-color: #f0fff4;
        color: #276749;
    }

    a {
        color: #4c51bf;
        text-decoration: none;
        transition: color 0.2s;
    }

    a:hover {
        color: #434190;
    }

    button {
        color: #e53e3e;
        background: none;
        border: none;
        cursor: pointer;
        transition: color 0.2s;
    }

    button:hover {
        color: #c53030;
    }

    .pagination {
        margin-top: 1rem;
    }

    details {
        cursor: pointer;
    }

    summary {
        display: block;
    }

    .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .summary-row span {
        flex: 1;
        padding: 0.75rem 1rem;
    }

    .kr-list, .parent-key-result-details {
        padding: 1rem;
        background-color: #f9fafb;
        margin-top: 1rem;
    }

    .kr-table {
        width: 100%;
        border-collapse: collapse;
    }

    .kr-table th, .kr-table td {
        padding: 0.5rem;
        border: 1px solid #e2e8f0;
    }

    .empty-kr {
        padding: 1rem;
        text-align: center;
        color: #a0aec0;
    }
</style>