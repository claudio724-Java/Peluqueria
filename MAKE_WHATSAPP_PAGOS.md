# Flujo de pago por WhatsApp con Make

## Variables necesarias

En `.env` configura:

```bash
APP_URL="https://tu-dominio.com"
WEBHOOK_SECRET="un-secreto-para-make"
STRIPE_SECRET_KEY="sk_live_o_test"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

## Llamada desde Make

Usa un módulo **HTTP > Make a request** contra:

```text
POST https://tu-dominio.com/api/webhooks/make
Content-Type: application/json
X-Signature: sha256=<firma-hmac-del-body>
```

Payload mínimo cuando el cobro está ligado a una cita:

```json
{
  "intent": "create_payment_link",
  "salonId": "SALON_ID",
  "appointmentId": "APPOINTMENT_ID",
  "conversationId": "opcional-id-whatsapp"
}
```

Payload alternativo cuando quieres cobrar un importe manual:

```json
{
  "intent": "create_payment_link",
  "salonId": "SALON_ID",
  "amountCents": 2500,
  "currency": "EUR",
  "customerName": "Ana",
  "customerPhone": "+34600111222",
  "customerEmail": "ana@example.com",
  "description": "Reserva de tratamiento"
}
```

## Respuesta del backend

```json
{
  "ok": true,
  "intent": "create_payment_link",
  "paymentId": "...",
  "appointmentId": "...",
  "amountCents": 2500,
  "currency": "EUR",
  "url": "https://checkout.stripe.com/...",
  "whatsappText": "Aquí tienes tu enlace de pago: https://checkout.stripe.com/...\nImporte: 25,00 €"
}
```

Ese `whatsappText` lo puedes enviar directamente con tu módulo de WhatsApp en Make.

## Consultar estado del pago

```json
{
  "intent": "get_payment_status",
  "paymentId": "PAYMENT_ID"
}
```

O por cita:

```json
{
  "intent": "get_payment_status",
  "salonId": "SALON_ID",
  "appointmentId": "APPOINTMENT_ID"
}
```

## Webhook de Stripe

En Stripe crea un webhook a:

```text
https://tu-dominio.com/api/webhooks/stripe
```

Eventos recomendados:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

## Firma HMAC para Make

Si configuras `WEBHOOK_SECRET`, firma el body JSON crudo con HMAC-SHA256.

Ejemplo conceptual:

```text
hex(hmac_sha256(raw_body, WEBHOOK_SECRET))
```

Y envíalo como:

```text
X-Signature: sha256=<hex>
```
