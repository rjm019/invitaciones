<?php

namespace App\Services\Reminders;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * WhatsApp Cloud API de Meta: manda la plantilla aprobada (cuerpo con nombre, evento y
 * fecha límite; botón con el enlace de la invitación y botón «Ya no recibir»).
 */
final class MetaWhatsAppChannel implements ReminderChannel
{
    /** Errores de Meta por token vencido o sin permisos: no tiene caso seguir. */
    private const FATAL_CODES = [190, 10, 200];

    /** @param  array<string, mixed>  $config  config('invitaciones.whatsapp') */
    public function __construct(private readonly array $config) {}

    public function send(string $phone, array $vars): ReminderResult
    {
        $url = "https://graph.facebook.com/{$this->config['graph_version']}/{$this->config['phone_number_id']}/messages";
        $text = fn (string $value) => ['type' => 'text', 'text' => $value];

        try {
            $response = Http::withToken((string) $this->config['token'])->timeout(15)->post($url, [
                'messaging_product' => 'whatsapp',
                'to' => $phone,
                'type' => 'template',
                'template' => [
                    'name' => $this->config['template'],
                    'language' => ['code' => $this->config['template_lang']],
                    'components' => [
                        ['type' => 'body', 'parameters' => [$text($vars['name']), $text($vars['event']), $text($vars['deadline'])]],
                        ['type' => 'button', 'sub_type' => 'url', 'index' => '0', 'parameters' => [$text($vars['token'])]],
                        ['type' => 'button', 'sub_type' => 'quick_reply', 'index' => '1', 'parameters' => [['type' => 'payload', 'payload' => 'BAJA']]],
                    ],
                ],
            ]);
        } catch (ConnectionException) {
            return new ReminderResult(false, errorCode: 'connection');
        }

        if ($response->successful() && ($id = $response->json('messages.0.id'))) {
            return new ReminderResult(true, (string) $id);
        }

        $code = $response->json('error.code');
        $fatal = $response->status() === 401 || in_array((int) $code, self::FATAL_CODES, true);

        return new ReminderResult(false, errorCode: $code !== null ? (string) $code : 'http-'.$response->status(), fatal: $fatal);
    }
}
