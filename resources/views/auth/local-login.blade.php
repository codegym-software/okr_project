<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đăng nhập Local - OKR System</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 min-h-screen flex items-center justify-center">
    <div class="max-w-md w-full space-y-8">
        <div>
            <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
                Đăng nhập Local
            </h2>
            <p class="mt-2 text-center text-sm text-gray-600">
                Sử dụng tài khoản local để test hệ thống
            </p>
        </div>
        
        <form class="mt-8 space-y-6" method="POST" action="{{ route('local.login') }}">
            @csrf
            
            @if ($errors->any())
                <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <ul class="list-disc list-inside">
                        @foreach ($errors->all() as $error)
                            <li>{{ $error }}</li>
                        @endforeach
                    </ul>
                </div>
            @endif

            <div class="rounded-md shadow-sm -space-y-px">
                <div>
                    <label for="email" class="sr-only">Email</label>
                    <input id="email" name="email" type="email" autocomplete="email" required 
                           class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                           placeholder="Email address" value="{{ old('email') }}">
                </div>
                <div>
                    <label for="password" class="sr-only">Password</label>
                    <input id="password" name="password" type="password" autocomplete="current-password" required 
                           class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm" 
                           placeholder="Password">
                </div>
            </div>

            <div>
                <button type="submit" 
                        class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Đăng nhập
                </button>
            </div>

            <div class="mt-6">
                <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h3 class="text-sm font-medium text-blue-800 mb-2">Tài khoản test:</h3>
                    <div class="text-xs text-blue-700 space-y-1">
                        <div><strong>Admin:</strong> admin@okr.local / Admin123!@#</div>
                        <div><strong>Manager:</strong> manager@okr.local / Manager123!@#</div>
                        <div><strong>Member:</strong> member@okr.local / Member123!@#</div>
                    </div>
                </div>
            </div>

            <div class="text-center">
                <a href="{{ route('login') }}" class="text-indigo-600 hover:text-indigo-500 text-sm">
                    ← Quay lại đăng nhập Cognito
                </a>
            </div>
        </form>
    </div>
</body>
</html>
