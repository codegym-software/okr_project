<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>@yield('title', 'My OKR')</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="{{ asset('assets/css/app.css') }}">
</head>
<body class="bg-gray-50">
    @auth
    <div class="min-h-screen">
        <!-- Header -->
        <div class="bg-white shadow-sm border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between items-center py-4">
                    <div class="flex items-center">
                        <h1 class="text-2xl font-bold text-gray-900">My OKR</h1>
                    </div>
                    <div class="flex items-center space-x-4">
                        @php
                            $user = Auth::user();
                            $avatar = $user && $user->avatar_url ? asset($user->avatar_url) : asset('images/default.png');
                            $name = $user && $user->full_name ? $user->full_name : 'User';
                        @endphp
                        <div class="flex items-center space-x-3">
                            <img src="{{ $avatar }}" alt="Avatar" class="w-8 h-8 rounded-full">
                            <span class="text-sm font-medium text-gray-700">{{ $name }}</span>
                        </div>
                        <form action="{{ route('auth.logout') }}" method="POST">
                            @csrf
                            <button type="submit" class="text-sm text-gray-500 hover:text-gray-700">Đăng xuất</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>

        <!-- Navigation -->
        <div class="bg-white border-b">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <nav class="flex space-x-8 py-3">
                    <a href="{{ route('dashboard') }}" class="text-sm font-medium text-gray-500 hover:text-gray-700">Home</a>
                    <a href="{{ route('cycles.index') }}" class="text-sm font-medium text-gray-500 hover:text-gray-700">Cycles</a>
                    <a href="{{ route('objectives.index') }}" class="text-sm font-medium text-gray-500 hover:text-gray-700">Objectives</a>
                    <a href="{{ route('my-okr.index') }}" class="text-sm font-medium text-blue-600 border-b-2 border-blue-600">My OKR</a>
                </nav>
            </div>
        </div>

        <!-- Main Content -->
        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            @yield('content')
        </main>
    </div>
    @endauth
</body>
</html>
