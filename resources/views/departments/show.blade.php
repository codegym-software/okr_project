@extends('layouts.app')

@section('content')
<div class="container">
    <h1>{{ $department->d_name }}</h1>
    <p><strong>Mô tả:</strong> {{ $department->d_description ?? 'Không có mô tả' }}</p>
    <a href="{{ route('departments.index') }}" class="btn btn-primary">Quay lại</a>
</div>
@endsection