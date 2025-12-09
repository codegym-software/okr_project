<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Mail\NotificationMail;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    /**
     * Send notification to user (both email and in-app)
     *
     * @param int $userId
     * @param string $message
     * @param string $type
     * @param int|null $cycleId
     * @param string|null $actionUrl
     * @param string|null $actionText
     * @param bool $sendEmail
     * @return Notification|null
     */
    public static function send(
        int $userId,
        string $message,
        string $type = 'general',
        ?int $cycleId = null,
        ?string $actionUrl = null,
        ?string $actionText = null,
        bool $sendEmail = true
    ): ?Notification {
        try {
            // Get user
            $user = User::find($userId);
            if (!$user) {
                Log::warning('NotificationService: User not found', ['user_id' => $userId]);
                return null;
            }

            // Determine action URL based on notification type if not provided
            // Only get default if actionUrl is explicitly null/empty AND not provided
            $finalActionUrl = $actionUrl;
            if (!$finalActionUrl) {
                $finalActionUrl = self::getDefaultActionUrl($type);
            }
            
            // Truncate action_url if too long (max 500 chars to be safe)
            if ($finalActionUrl && strlen($finalActionUrl) > 500) {
                $finalActionUrl = substr($finalActionUrl, 0, 500);
            }

            // Create in-app notification
            $notification = Notification::create([
                'user_id' => $userId,
                'message' => $message,
                'type' => $type,
                'is_read' => false,
                'cycle_id' => $cycleId,
                'action_url' => $finalActionUrl,
            ]);

            // Send email notification
            if ($sendEmail && $user->email) {
                self::sendEmail($user, $message, $type, $finalActionUrl, $actionText);
            }

            return $notification;

        } catch (\Exception $e) {
            Log::error('NotificationService: Error sending notification', [
                'user_id' => $userId,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
            // Không throw để không làm gián đoạn flow chính (comment vẫn được tạo)
            return null;
        }
    }

    /**
     * Send email notification
     *
     * @param User $user
     * @param string $message
     * @param string $type
     * @param string|null $actionUrl
     * @param string|null $actionText
     * @return void
     */
    public static function sendEmail(
        User $user,
        string $message,
        string $type,
        ?string $actionUrl = null,
        ?string $actionText = null
    ): void {
        try {
            // Determine action URL based on notification type if not provided
            if (!$actionUrl) {
                $actionUrl = self::getDefaultActionUrl($type);
            }

            // Determine action text based on notification type if not provided
            if (!$actionText) {
                $actionText = self::getDefaultActionText($type);
            }

            $recipientName = $user->full_name ?? $user->email;

            Mail::to($user->email)->send(
                new NotificationMail(
                    $message,
                    $type,
                    $recipientName,
                    $actionUrl,
                    $actionText
                )
            );

            Log::info('NotificationService: Email sent successfully', [
                'user_id' => $user->user_id,
                'email' => $user->email,
                'type' => $type,
            ]);

        } catch (\Exception $e) {
            Log::error('NotificationService: Error sending email', [
                'user_id' => $user->user_id,
                'email' => $user->email,
                'type' => $type,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Send notification to multiple users
     *
     * @param array $userIds
     * @param string $message
     * @param string $type
     * @param int|null $cycleId
     * @param string|null $actionUrl
     * @param string|null $actionText
     * @param bool $sendEmail
     * @return array
     */
    public static function sendToMany(
        array $userIds,
        string $message,
        string $type = 'general',
        ?int $cycleId = null,
        ?string $actionUrl = null,
        ?string $actionText = null,
        bool $sendEmail = true
    ): array {
        $notifications = [];

        foreach ($userIds as $userId) {
            $notification = self::send(
                $userId,
                $message,
                $type,
                $cycleId,
                $actionUrl,
                $actionText,
                $sendEmail
            );

            if ($notification) {
                $notifications[] = $notification;
            }
        }

        return $notifications;
    }

    /**
     * Get default action URL based on notification type
     *
     * @param string $type
     * @return string
     */
    private static function getDefaultActionUrl(string $type): string
    {
        // Chỉ trả về path, không bao gồm domain để bảo mật
        return match ($type) {
            'kr_assigned', 'kr_assignment' => '/my-objectives',
            'okr_link', 'link_request' => '/my-objectives',
            'link_approved', 'link_rejected' => '/my-objectives',
            'check_in' => '/my-objectives',
            'reminder' => '/my-objectives',
            'comment' => '/my-objectives',
            default => '/dashboard',
        };
    }

    /**
     * Get default action text based on notification type
     *
     * @param string $type
     * @return string
     */
    private static function getDefaultActionText(string $type): string
    {
        return match ($type) {
            'kr_assigned', 'kr_assignment' => 'Xem Key Result',
            'okr_link', 'link_request' => 'Xem yêu cầu liên kết',
            'link_approved' => 'Xem liên kết',
            'link_rejected' => 'Xem chi tiết',
            'check_in' => 'Xem check-in',
            'reminder' => 'Check-in ngay',
            default => 'Xem chi tiết',
        };
    }
}

