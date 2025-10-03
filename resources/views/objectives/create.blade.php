@extends('layouts.app')

@section('content')
<style>
/* ------------------------------------------------------------------
   Objective Create – custom styles (no Tailwind)
   ------------------------------------------------------------------ */

/* Main wrapper – replaces .min-h-screen.bg-gradient-to-br.from-blue-50.to-indigo-100.py-8 */
.objective-container {
    min-height: 100vh;
    background: linear-gradient(to bottom right, #eff6ff, #e0e7ff);
    padding: 2rem 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.dark .objective-container {
    background: linear-gradient(to bottom right, #1e3a8a, #312e81);
}

/* Inner wrapper – replaces .max-w-5xl.mx-auto.px-4.sm:px-6.lg:px-8 */
.inner-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0 1rem;
}
@media (min-width: 640px) {
    .inner-container { padding: 0 1.5rem; }
}
@media (min-width: 1024px) {
    .inner-container { padding: 0 2rem; }
}

/* Header section – replaces .mb-8 */
.header-section {
    margin-bottom: 2rem;
}

/* Header flex – replaces .flex.items-center.space-x-3.mb-4 */
.header-flex {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
}

/* Icon container – replaces .p-2.bg-blue-100.rounded-lg */
.icon-container {
    padding: 0.5rem;
    background: #dbeafe;
    border-radius: 0.5rem;
}
.dark .icon-container {
    background: #1e40af;
}

/* Icon – replaces .w-6.h-6.text-blue-600 */
.header-icon {
    width: 1.5rem;
    height: 1.5rem;
    color: #2563eb;
}
.dark .header-icon {
    color: #93c5fd;
}

/* Header title – replaces .text-3xl.font-bold.text-gray-900 */
.header-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: #111827;
}
.dark .header-title {
    color: #e9ecef;
}

/* Header subtitle – replaces .text-gray-600.mt-1 */
.header-subtitle {
    color: #4b5563;
    margin-top: 0.25rem;
}
.dark .header-subtitle {
    color: #9ca3af;
}

/* Form card – replaces .bg-white.rounded-2xl.shadow-xl.border.border-gray-100.overflow-hidden */
.form-card {
    background: #ffffff;
    border-radius: 1rem;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
    border: 1px solid #f3f4f6;
    overflow: hidden;
}
.dark .form-card {
    background: #161615;
    border-color: #374151;
}

/* Form header – replaces .bg-gradient-to-r.from-blue-600.to-indigo-600.px-8.py-6 */
.form-header {
    background: linear-gradient(to right, #2563eb, #4f46e5);
    padding: 1.5rem 2rem;
}
.dark .form-header {
    background: linear-gradient(to right, #1e40af, #3730a3);
}

/* Form header title – replaces .text-xl.font-semibold.text-white */
.form-header-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #ffffff;
}

/* Form header subtitle – replaces .text-blue-100.mt-1 */
.form-header-subtitle {
    color: #dbeafe;
    margin-top: 0.25rem;
}
.dark .form-header-subtitle {
    color: #bfdbfe;
}

/* Form body – replaces .p-8 */
.form-body {
    padding: 2rem;
}

/* Error message – replaces .bg-red-50.border-l-4.border-red-400.text-red-700.px-6.py-4.rounded-lg.mb-8 */
.error-message {
    background: #fef2f2;
    border-left: 4px solid #f87171;
    color: #b91c1c;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
}
.dark .error-message {
    background: #7f1d1d;
    border-color: #ef4444;
    color: #fee2e2;
}

/* Error icon – replaces .w-24.h-24.mr-3.text-red-400 (adjusted for reasonable size) */
.error-icon {
    width: 1.5rem;
    height: 1.5rem;
    margin-right: 0.75rem;
    color: #f87171;
}
.dark .error-icon {
    color: #fca5a5;
}

/* Error title – replaces .font-medium.text-red-800 */
.error-title {
    font-weight: 500;
    color: #991b1b;
}
.dark .error-title {
    color: #fecaca;
}

/* Error list – replaces .list-disc.list-inside.mt-2.text-red-700 */
.error-list {
    list-style: disc;
    list-style-position: inside;
    margin-top: 0.5rem;
    color: #b91c1c;
}
.dark .error-list {
    color: #fee2e2;
}

/* Form group – replaces .space-y-8 (for form) and .space-y-3 (for inputs) */
.form-group {
    margin-bottom: 2rem;
}
.input-group {
    margin-bottom: 0.75rem;
}

/* Label – replaces .block.text-sm.font-semibold.text-gray-700 */
.form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
}
.dark .form-label {
    color: #d1d5db;
}

/* Required asterisk – replaces .text-red-500 */
.required-asterisk {
    color: #ef4444;
}

/* Input fields – replaces .w-full.px-4.py-4.border-2.border-gray-200.rounded-xl.focus:ring-4.focus:ring-blue-100.focus:border-blue-500.transition-all.duration-200 */
.form-input,
.form-textarea,
.form-select {
    width: 100%;
    padding: 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    transition: all 0.2s ease;
}
.form-input:focus,
.form-textarea:focus,
.form-select:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px #dbeafe;
}
.dark .form-input,
.dark .form-textarea,
.dark .form-select {
    background: #1f2937;
    border-color: #4b5563;
    color: #e5e7eb;
}
.dark .form-input:focus,
.dark .form-textarea:focus,
.dark .form-select:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 4px #1e40af;
}

/* Error states for inputs – replaces .border-red-300.focus:ring-red-100.focus:border-red-500 */
.form-input.error,
.form-textarea.error,
.form-select.error {
    border-color: #fca5a5;
}
.form-input.error:focus,
.form-textarea.error:focus,
.form-select.error:focus {
    border-color: #ef4444;
    box-shadow: 0 0 0 4px #fee2e2;
}
.dark .form-input.error,
.dark .form-textarea.error,
.dark .form-select.error {
    border-color: #f87171;
}
.dark .form-input.error:focus,
.dark .form-textarea.error:focus,
.dark .form-select.error:focus {
    box-shadow: 0 0 0 4px #7f1d1d;
}

/* Input icon – replaces .w-5.h-5.text-gray-400 */
.input-icon {
    width: 1.25rem;
    height: 1.25rem;
    color: #9ca3af;
}
.dark .input-icon {
    color: #6b7280;
}

/* Textarea specific – replaces .resize-none */
.form-textarea {
    resize: none;
}

/* Select specific – replaces .w-full.px-4.py-4.border-2... and custom select styles */
.form-select {
    appearance: none;
    background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M12.53 5.47a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06L7.5 9.44l3.97-3.97a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>') no-repeat right 0.5rem center/1rem 1rem;
    padding-right: 2rem;
}
.dark .form-select {
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M12.53 5.47a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-2-2a.75.75 0 0 1 1.06-1.06L7.5 9.44l3.97-3.97a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd"/></svg>');
    background-color: #1f2937;
    color: #e5e7eb;
}

/* Error message text – replaces .text-sm.text-red-600 */
.error-text {
    font-size: 0.875rem;
    color: #dc2626;
}
.dark .error-text {
    color: #f87171;
}

/* Key results section – replaces .space-y-6 */
.key-results-section {
    margin-bottom: 1.5rem;
}

/* Key results header – replaces .flex.justify-between.items-center */
.key-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* Key results title – replaces .text-xl.font-semibold.text-gray-900 */
.key-results-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
}
.dark .key-results-title {
    color: #e9ecef;
}

/* Add key result button – replaces .inline-flex.items-center.px-4.py-2.bg-green-600.hover:bg-green-700.text-white.rounded-xl.font-medium.transition-all.duration-200 */
.add-key-result-btn {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 1rem;
    background: #16a34a;
    color: #ffffff;
    border-radius: 0.75rem;
    font-weight: 500;
    transition: background 0.2s ease;
}
.add-key-result-btn:hover {
    background: #15803d;
}
.dark .add-key-result-btn {
    background: #15803d;
}
.dark .add-key-result-btn:hover {
    background: #166534;
}

/* Add key result icon – replaces .w-5.h-5.mr-2 */
.add-key-result-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-right: 0.5rem;
}

/* Key results container – replaces .space-y-6 */
.key-results-container {
    margin-bottom: 1.5rem;
}

/* Form buttons – replaces .flex.justify-end.space-x-4.mt-8 */
.form-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
}

/* Cancel button – replaces .px-6.py-3.border-2.border-gray-200.rounded-xl.text-gray-700.hover:bg-gray-50.transition-all.duration-200.font-medium */
.cancel-button {
    padding: 0.75rem 1.5rem;
    border: 2px solid #e5e7eb;
    border-radius: 0.75rem;
    color: #4b5563;
    text-decoration: none;
    font-weight: 500;
    transition: background 0.2s ease;
}
.cancel-button:hover {
    background: #f9fafb;
}
.dark .cancel-button {
    border-color: #4b5563;
    color: #d1d5db;
}
.dark .cancel-button:hover {
    background: #374151;
}

/* Submit button – replaces .px-6.py-3.bg-gradient-to-r.from-blue-600.to-indigo-600.text-white.rounded-xl.hover:from-blue-700.hover:to-indigo-700.transition-all.duration-200.font-medium.shadow-md.hover:shadow-lg */
.submit-button {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(to right, #2563eb, #4f46e5);
    color: #ffffff;
    border-radius: 0.75rem;
    font-weight: 500;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
    transition: all 0.2s ease;
}
.submit-button:hover {
    background: linear-gradient(to right, #1d4ed8, #4338ca);
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
}
.dark .submit-button {
    background: linear-gradient(to right, #1e40af, #3730a3);
}
.dark .submit-button:hover {
    background: linear-gradient(to right, #1e3a8a, #312e81);
}
</style>

<div class="objective-container">
    <div class="inner-container">
        <!-- Header -->
        <div class="header-section">
            <div class="header-flex">
                <div class="icon-container">
                    <svg class="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <div>
                    <h1 class="header-title">Create New Objective</h1>
                    <p class="header-subtitle">Set a clear, measurable objective for your team</p>
                </div>
            </div>
        </div>

        <!-- Form -->
        <div class="form-card">
            <!-- Form Header -->
            <div class="form-header">
                <h2 class="form-header-title">Objective Details</h2>
                <p class="form-header-subtitle">Fill in the information below to create your objective</p>
            </div>

            <div class="form-body">
                @if ($errors->any())
                    <div class="error-message">
                        <div class="flex">
                            <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                            </svg>
                            <div>
                                <h4 class="error-title">Please fix the following errors:</h4>
                                <ul class="error-list">
                                    @foreach ($errors->all() as $error)
                                        <li>{{ $error }}</li>
                                    @endforeach
                                </ul>
                            </div>
                        </div>
                    </div>
                @endif

                <form action="{{ route('objectives.store') }}" method="POST" class="form-group">
                    @csrf
                    <input type="hidden" name="cycle_id" value="{{ $cycle_id }}">

                    <!-- Objective Title -->
                    <div class="input-group">
                        <label for="obj_title" class="form-label">
                            Objective Title <span class="required-asterisk">*</span>
                        </label>
                        <div class="relative">
                            <input type="text" 
                                   id="obj_title" 
                                   name="obj_title" 
                                   value="{{ old('obj_title') }}"
                                   class="form-input @error('obj_title') error @enderror"
                                   placeholder="e.g., Increase quarterly revenue by 25%"
                                   required>
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <svg class="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                            </div>
                        </div>
                        @error('obj_title')
                            <p class="error-text flex items-center">
                                <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                {{ $message }}
                            </p>
                        @enderror
                    </div>

                    <!-- Description -->
                    <div class="input-group">
                        <label for="description" class="form-label">
                            Description
                        </label>
                        <textarea id="description" 
                                  name="description" 
                                  rows="4"
                                  class="form-textarea @error('description') error @enderror"
                                  placeholder="Provide more context about this objective...">{{ old('description') }}</textarea>
                        @error('description')
                            <p class="error-text flex items-center">
                                <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                {{ $message }}
                            </p>
                        @enderror
                    </div>

                    <!-- Chọn level cho OKR -->
                    <div class="input-group">
                        <label for="level" class="form-label">Cấp OKR</label>
                        <div class="relative">
                            <select id="level" name="level" autocomplete="level-name" class="form-select">
                                <option>Công ty</option>
                                <option>Phòng ban</option>
                                <option>Nhóm</option>
                                <option>Cá nhân</option>
                            </select>
                        </div>
                    </div>

                    <!-- Status -->
                    <div class="input-group">
                        <label for="status" class="form-label">
                            Status <span class="required-asterisk">*</span>
                        </label>
                        <select id="status" name="status" class="form-select @error('status') error @enderror" required>
                            <option value="draft" {{ old('status') == 'draft' ? 'selected' : '' }}>Draft</option>
                            <option value="active" {{ old('status') == 'active' ? 'selected' : '' }}>Active</option>
                            <option value="completed" {{ old('status') == 'completed' ? 'selected' : '' }}>Completed</option>
                        </select>
                        @error('status')
                            <p class="error-text flex items-center">
                                <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                {{ $message }}
                            </p>
                        @enderror
                    </div>

                    <!-- Progress Percent -->
                    <div class="input-group">
                        <label for="progress_percent" class="form-label">
                            Progress Percent
                        </label>
                        <input type="number" 
                               id="progress_percent" 
                               name="progress_percent" 
                               value="{{ old('progress_percent', 0) }}"
                               min="0" max="100" step="1"
                               class="form-input @error('progress_percent') error @enderror"
                               placeholder="0">
                        @error('progress_percent')
                            <p class="error-text flex items-center">
                                <svg class="error-icon" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                                {{ $message }}
                            </p>
                        @enderror
                    </div>

                    <!-- Submit Button -->
                    <div class="form-buttons">
                        <a href="{{ route('cycles.show', $cycle_id) }}" 
                           class="cancel-button">
                            Cancel
                        </a>
                        <button type="submit" 
                                class="submit-button">
                            Create Objective
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
@endsection