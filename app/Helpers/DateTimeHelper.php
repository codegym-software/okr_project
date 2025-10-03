<?php

namespace App\Helpers;

use Carbon\Carbon;

class DateTimeHelper
{
    /**
     * Format datetime theo timezone GMT+7 (Việt Nam)
     */
    public static function formatVietnam($datetime, $format = 'd/m/Y H:i')
    {
        if (!$datetime) {
            return 'Chưa có';
        }

        if (is_string($datetime)) {
            $datetime = Carbon::parse($datetime);
        }

        return $datetime->setTimezone('Asia/Ho_Chi_Minh')->format($format);
    }

    /**
     * Lấy thời gian hiện tại theo GMT+7
     */
    public static function now($format = 'd/m/Y H:i')
    {
        return Carbon::now('Asia/Ho_Chi_Minh')->format($format);
    }

    /**
     * Lấy timestamp hiện tại theo GMT+7
     */
    public static function nowTimestamp()
    {
        return Carbon::now('Asia/Ho_Chi_Minh')->timestamp;
    }
}
