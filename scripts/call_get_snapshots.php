<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Http\Request;
use App\Http\Controllers\ReportController;

$req = Request::create('/api/reports/snapshots', 'GET', ['scope' => 'company']);
$controller = new ReportController();
$response = $controller->getSnapshots($req);
// $response is a JsonResponse
echo $response->getContent();
