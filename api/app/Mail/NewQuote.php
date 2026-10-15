<?php

namespace App\Mail;

use App\Services\Quotes\QuoteNotifier;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** El aviso de una cotización nueva: texto simple, con el WhatsApp listo para tocar. */
class NewQuote extends Mailable
{
    /** @param  array<string, string>  $quote */
    public function __construct(public readonly array $quote) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: QuoteNotifier::subject($this->quote));
    }

    public function content(): Content
    {
        $body = QuoteNotifier::body($this->quote);
        $html = '<div style="font:15px/1.6 -apple-system,Segoe UI,sans-serif;color:#1d1d1f">'
            .(string) preg_replace('#(https://\S+)#', '<a href="$1">$1</a>', nl2br(e($body)))
            .'</div>';

        return new Content(htmlString: $html);
    }
}
