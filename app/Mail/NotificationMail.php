<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NotificationMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public string $notificationMessage;
    public string $notificationType;
    public string $recipientName;
    public ?string $actionUrl;
    public ?string $actionText;

    /**
     * Create a new message instance.
     */
    public function __construct(
        string $message,
        string $type,
        string $recipientName,
        ?string $actionUrl = null,
        ?string $actionText = null
    ) {
        $this->notificationMessage = $message;
        $this->notificationType = $type;
        $this->recipientName = $recipientName;
        $this->actionUrl = $actionUrl;
        $this->actionText = $actionText;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        $subject = $this->getSubjectByType();
        
        return new Envelope(
            subject: $subject,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.notification',
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }

    /**
     * Get email subject based on notification type
     */
    private function getSubjectByType(): string
    {
        return match ($this->notificationType) {
            'kr_assigned', 'kr_assignment' => '[OKR] Bạn được giao Key Result mới',
            'check_in' => '[OKR] Thông báo Check-in',
            'okr_link', 'link_request' => '[OKR] Yêu cầu liên kết OKR',
            'link_approved' => '[OKR] Yêu cầu liên kết đã được chấp thuận',
            'link_rejected' => '[OKR] Yêu cầu liên kết bị từ chối',
            'reminder' => '[OKR] Nhắc nhở Check-in',
            default => '[OKR] Thông báo mới',
        };
    }
}

