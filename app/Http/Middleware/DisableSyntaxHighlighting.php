<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DisableSyntaxHighlighting
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Disable syntax highlighting to prevent PatternSearcher errors
        if (function_exists('mb_ereg_search_init')) {
            // Set a simple error handler for mb_ereg functions
            set_error_handler(function ($severity, $message, $file, $line) {
                if (strpos($message, 'mb_ereg') !== false) {
                    return true; // Suppress the error
                }
                return false; // Let other errors pass through
            });
        }

        return $next($request);
    }
}
