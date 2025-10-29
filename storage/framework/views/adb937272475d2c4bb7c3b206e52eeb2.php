<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>OKR Project</title>
    <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
    <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
    <?php echo app('Illuminate\Foundation\Vite')(['resources/css/app.css', 'resources/js/main.jsx']); ?>
</head>
<body class="min-h-screen bg-body-bg text-body-color">
    <div id="app"></div>

    <script>
        (function(){
            const u = <?php echo json_encode(auth()->user() ? auth()->user()->load('role') : null, 15, 512) ?>;
            if (u) {
                window.__USER__ = {
                    name: u.full_name || u.name || null,
                    email: u.email || null,
                    avatar: u.avatar_url || null,
                    role: u.role ? { role_name: u.role.role_name, level: u.role.level } : null,
                    is_admin: <?php echo json_encode(auth()->check() && auth()->user()->isAdmin(), 15, 512) ?>,
                };
            } else {
                window.__USER__ = null;
            }
        })();
    </script>
</body>
</html>


<?php /**PATH D:\Thuc_tap\OKR_React_main\OKR_Project\resources\views/app.blade.php ENDPATH**/ ?>