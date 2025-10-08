@extends('layouts.app')

@section('content')
    <div class="content-container">
        <h1 class="page-title">Tạo OKR Cấp Phòng Ban</h1>

        @if ($errors->any())
            <div class="error-alert" role="alert">
                <ul>
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
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

        <form action="{{ route('my-objectives.store') }}" method="POST" class="form-container">
            @csrf
            <div class="form-grid">
                <!-- Tiêu đề Objective -->
                <div class="form-group">
                    <label for="obj_title" class="form-label">Tiêu đề Objective *</label>
                    <input type="text" name="obj_title" id="obj_title" value="{{ old('obj_title') }}" class="form-input">
                    @error('obj_title') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Mô tả -->
                <div class="form-group">
                    <label for="description" class="form-label">Mô tả</label>
                    <textarea name="description" id="description" class="form-input form-textarea">{{ old('description') }}</textarea>
                    @error('description') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Cấp độ -->
                <div class="form-group">
                    <label for="level" class="form-label">Cấp Objective *</label>
                    <input type="hidden" name="level" value="Phòng ban">
                    <input type="text" value="Phòng ban" class="form-input" disabled>
                    @error('level') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Trạng thái -->
                <div class="form-group">
                    <label for="status" class="form-label">Trạng thái *</label>
                    <select name="status" id="status" class="form-input form-select">
                        <option value="draft" {{ old('status') == 'draft' ? 'selected' : '' }}>Bản nháp</option>
                        <option value="active" {{ old('status') == 'active' ? 'selected' : '' }}>Đang thực hiện</option>
                        <option value="completed" {{ old('status') == 'completed' ? 'selected' : '' }}>Hoàn thành</option>
                    </select>
                    @error('status') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Tiến độ -->
                <div class="form-group">
                    <label for="progress_percent" class="form-label">Tiến độ (%)</label>
                    <input type="number" name="progress_percent" id="progress_percent" value="{{ old('progress_percent') }}" class="form-input" min="0" max="100">
                    @error('progress_percent') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Chu kỳ -->
                <div class="form-group">
                    <label for="cycle_id" class="form-label">Chu kỳ *</label>
                    <select name="cycle_id" id="cycle_id" class="form-input form-select">
                        <option value="">Chọn chu kỳ</option>
                        @foreach($cycles as $cycle)
                            <option value="{{ $cycle->cycle_id }}" {{ old('cycle_id') == $cycle->cycle_id ? 'selected' : '' }}>
                                {{ $cycle->cycle_name }}
                            </option>
                        @endforeach
                    </select>
                    @error('cycle_id') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Phòng ban -->
                @if($user->role->role_name === 'Admin')
                    <div class="form-group">
                        <label for="department_id" class="form-label">Phòng ban *</label>
                        <select name="department_id" id="department_id" class="form-input form-select">
                            <option value="">Chọn phòng ban</option>
                            @foreach($departments as $department)
                                <option value="{{ $department->department_id }}" {{ old('department_id') == $department->department_id ? 'selected' : '' }}>
                                    {{ $department->d_name }}
                                </option>
                            @endforeach
                        </select>
                        @error('department_id') <span class="error-message">{{ $message }}</span> @enderror
                    </div>
                @elseif($user->role->role_name === 'Manager')
                    <div class="form-group">
                        <label for="department_id" class="form-label">Phòng ban *</label>
                        <input type="hidden" name="department_id" value="{{ $departments[0]->department_id }}">
                        <input type="text" value="{{ $departments[0]->d_name }}" class="form-input" disabled>
                        @error('department_id') <span class="error-message">{{ $message }}</span> @enderror
                    </div>
                @endif

                <!-- Key Result cấp công ty -->
                <div class="form-group">
                    <label for="parent_key_result_id" class="form-label">Liên kết Key Result cấp công ty</label>
                    <select name="parent_key_result_id" id="parent_key_result_id" class="form-input form-select">
                        <option value="">Không liên kết</option>
                        @foreach($companyKeyResults as $keyResult)
                            <option value="{{ $keyResult->kr_id }}" {{ old('parent_key_result_id') == $keyResult->kr_id ? 'selected' : '' }}>
                                {{ $keyResult->kr_title }} (Objective: {{ $keyResult->objective->obj_title }})
                            </option>
                        @endforeach
                    </select>
                    @error('parent_key_result_id') <span class="error-message">{{ $message }}</span> @enderror
                </div>

                <!-- Chi tiết Key Result cấp công ty -->
                <div id="company-key-result-details" style="display: none;">
                    <h3>Chi tiết Key Result cấp công ty</h3>
                    <p><strong>Tiêu đề Key Result:</strong> <span id="company-kr-title"></span></p>
                    <p><strong>Mục tiêu:</strong> <span id="company-kr-target"></span></p>
                    <p><strong>Giá trị hiện tại:</strong> <span id="company-kr-current"></span></p>
                    <p><strong>Đơn vị:</strong> <span id="company-kr-unit"></span></p>
                    <p><strong>Trạng thái:</strong> <span id="company-kr-status"></span></p>
                    <p><strong>Trọng số:</strong> <span id="company-kr-weight"></span></p>
                    <p><strong>Tiến độ:</strong> <span id="company-kr-progress"></span></p>
                    <h4>Objective cấp công ty liên kết</h4>
                    <p><strong>Tiêu đề:</strong> <span id="company-obj-title"></span></p>
                    <p><strong>Mô tả:</strong> <span id="company-obj-description"></span></p>
                </div>

                <!-- Key Results -->
                <div class="form-group full-width">
                    <label class="form-label">Key Results *</label>
                    <div id="key-results-container">
                        <div class="key-result-group">
                            <div class="form-group">
                                <label for="key_results[0][kr_title]" class="form-label">Tiêu đề Key Result *</label>
                                <input type="text" name="key_results[0][kr_title]" class="form-input">
                                @error('key_results.0.kr_title') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][target_value]" class="form-label">Mục tiêu *</label>
                                <input type="number" name="key_results[0][target_value]" class="form-input">
                                @error('key_results.0.target_value') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][current_value]" class="form-label">Giá trị hiện tại *</label>
                                <input type="number" name="key_results[0][current_value]" class="form-input">
                                @error('key_results.0.current_value') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][unit]" class="form-label">Đơn vị *</label>
                                <input type="text" name="key_results[0][unit]" class="form-input">
                                @error('key_results.0.unit') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][status]" class="form-label">Trạng thái *</label>
                                <select name="key_results[0][status]" class="form-input form-select">
                                    <option value="draft">Bản nháp</option>
                                    <option value="active">Đang thực hiện</option>
                                    <option value="completed">Hoàn thành</option>
                                </select>
                                @error('key_results.0.status') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][weight]" class="form-label">Trọng số (%)*</label>
                                <input type="number" name="key_results[0][weight]" class="form-input" min="0" max="100">
                                @error('key_results.0.weight') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                            <div class="form-group">
                                <label for="key_results[0][progress_percent]" class="form-label">Tiến độ (%)</label>
                                <input type="number" name="key_results[0][progress_percent]" class="form-input" min="0" max="100">
                                @error('key_results.0.progress_percent') <span class="error-message">{{ $message }}</span> @enderror
                            </div>
                        </div>
                    </div>
                    @error('key_results') <span class="error-message">{{ $message }}</span> @enderror
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="submit-btn">Tạo Objective</button>
                <a href="{{ route('my-objectives.index') }}" class="cancel-link">Hủy</a>
            </div>
        </form>
    </div>
@endsection

<style>
    .content-container {
        margin-left: auto;
        margin-right: auto;
        padding: 1.5rem;
    }

    .page-title {
        font-size: 1.5rem;
        font-weight: bold;
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

    .form-container {
        background-color: white;
        padding: 1.5rem;
        border-radius: 0.375rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    @media (min-width: 768px) {
        .form-grid {
            grid-template-columns: 1fr 1fr;
        }
    }

    .form-group {
        display: block;
    }

    .form-label {
        display: block;
        font-size: 0.875rem;
        font-weight: medium;
        color: #4a5568;
    }

    .form-input,
    .form-select,
    .form-textarea {
        margin-top: 0.25rem;
        display: block;
        width: 100%;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        padding: 0.5rem;
        transition: border-color 0.15s, box-shadow 0.15s;
    }

    .form-input:disabled {
        background-color: #f7fafc;
        cursor: not-allowed;
    }

    .form-textarea {
        height: 100px;
        resize: vertical;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
    }

    .form-input:blur,
    .form-select:blur,
    .form-textarea:blur {
        border-color: #e2e8f0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .error-message {
        color: #e53e3e;
        font-size: 0.75rem;
    }

    .form-actions {
        margin-top: 1.5rem;
    }

    .submit-btn {
        background-color: #38a169;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        transition: background-color 0.2s;
    }

    .submit-btn:hover {
        background-color: #2f855a;
    }

    .cancel-link {
        margin-left: 1rem;
        color: #718096;
        text-decoration: none;
        transition: color 0.2s;
    }

    .cancel-link:hover {
        color: #4a5568;
    }

    .add-btn {
        background-color: #4c51bf;
        color: white;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        margin-top: 1rem;
        transition: background-color 0.2s;
    }

    .add-btn:hover {
        background-color: #434190;
    }

    .remove-key-result {
        background-color: #e53e3e;
        color: white;
        padding: 0.5rem;
        border-radius: 0.375rem;
        margin-top: 1rem;
    }

    .remove-key-result:hover {
        background-color: #c53030;
    }

    .key-result-group {
        border: 1px solid #e2e8f0;
        padding: 1rem;
        border-radius: 0.375rem;
        margin-bottom: 1rem;
    }

    .full-width {
        grid-column: 1 / -1;
    }

    #company-key-result-details {
        margin-top: 1rem;
        padding: 1rem;
        background-color: #f9fafb;
        border-radius: 0.375rem;
    }
</style>

<script>
    document.getElementById('parent_key_result_id').addEventListener('change', function() {
        const keyResultId = this.value;
        const detailsContainer = document.getElementById('company-key-result-details');
        const krTitleSpan = document.getElementById('company-kr-title');
        const krTargetSpan = document.getElementById('company-kr-target');
        const krCurrentSpan = document.getElementById('company-kr-current');
        const krUnitSpan = document.getElementById('company-kr-unit');
        const krStatusSpan = document.getElementById('company-kr-status');
        const krWeightSpan = document.getElementById('company-kr-weight');
        const krProgressSpan = document.getElementById('company-kr-progress');
        const objTitleSpan = document.getElementById('company-obj-title');
        const objDescriptionSpan = document.getElementById('company-obj-description');

        if (!keyResultId) {
            detailsContainer.style.display = 'none';
            krTitleSpan.textContent = '';
            krTargetSpan.textContent = '';
            krCurrentSpan.textContent = '';
            krUnitSpan.textContent = '';
            krStatusSpan.textContent = '';
            krWeightSpan.textContent = '';
            krProgressSpan.textContent = '';
            objTitleSpan.textContent = '';
            objDescriptionSpan.textContent = '';
            return;
        }

        fetch(`/my-objectives/key-result-details/${keyResultId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'X-CSRF-TOKEN': '{{ csrf_token() }}'
            }
        })
        .then(response => response.json())
        .then(data => {
            krTitleSpan.textContent = data.kr_title;
            krTargetSpan.textContent = data.target_value;
            krCurrentSpan.textContent = data.current_value;
            krUnitSpan.textContent = data.unit;
            krStatusSpan.textContent = data.status;
            krWeightSpan.textContent = data.weight + '%';
            krProgressSpan.textContent = data.progress_percent + '%';
            objTitleSpan.textContent = data.objective_title;
            objDescriptionSpan.textContent = data.objective_description || 'Không có mô tả';
            detailsContainer.style.display = 'block';
        })
        .catch(error => {
            console.error('Error:', error);
            detailsContainer.style.display = 'none';
            alert('Không thể tải chi tiết Key Result cấp công ty.');
        });
    });

    let krIndex = 1;
    document.getElementById('add-key-result').addEventListener('click', function() {
        const container = document.getElementById('key-results-container');
        const newKrGroup = document.createElement('div');
        newKrGroup.className = 'key-result-group';
        newKrGroup.innerHTML = `
            <div class="form-group">
                <label for="key_results[${krIndex}][kr_title]" class="form-label">Tiêu đề Key Result *</label>
                <input type="text" name="key_results[${krIndex}][kr_title]" class="form-input">
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][target_value]" class="form-label">Mục tiêu *</label>
                <input type="number" name="key_results[${krIndex}][target_value]" class="form-input">
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][current_value]" class="form-label">Giá trị hiện tại *</label>
                <input type="number" name="key_results[${krIndex}][current_value]" class="form-input">
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][unit]" class="form-label">Đơn vị *</label>
                <input type="text" name="key_results[${krIndex}][unit]" class="form-input">
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][status]" class="form-label">Trạng thái *</label>
                <select name="key_results[${krIndex}][status]" class="form-input form-select">
                    <option value="draft">Bản nháp</option>
                    <option value="active">Đang thực hiện</option>
                    <option value="completed">Hoàn thành</option>
                </select>
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][weight]" class="form-label">Trọng số (%)*</label>
                <input type="number" name="key_results[${krIndex}][weight]" class="form-input" min="0" max="100">
            </div>
            <div class="form-group">
                <label for="key_results[${krIndex}][progress_percent]" class="form-label">Tiến độ (%)</label>
                <input type="number" name="key_results[${krIndex}][progress_percent]" class="form-input" min="0" max="100">
            </div>
            <button type="button" class="remove-key-result">Xóa</button>
        `;
        container.appendChild(newKrGroup);
        krIndex++;
    });

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('remove-key-result')) {
            e.target.parentElement.remove();
        }
    });
</script>