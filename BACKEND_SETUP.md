# HairBook Backend (Next.js + Prisma + Postgres)

## 1) Instalar dependencias

```bash
npm install
```

## 2) Configurar variables de entorno

Copia el ejemplo:

```bash
cp .env.example .env
```

Edita `DATABASE_URL` con tu Postgres (Neon o Supabase).

## 3) Crear tablas (migración)

```bash
npm run prisma:migrate
```

Luego genera el cliente (si hiciera falta):

```bash
npm run prisma:generate
```

## 4) Ver la DB en Prisma Studio

```bash
npm run prisma:studio
```

## 5) Endpoints disponibles (MVP)

- `GET /api/health`
- `GET /api/appointments?salonId=...&from=ISO&to=ISO`
- `POST /api/appointments`
- `GET /api/appointments/:id`
- `PATCH /api/appointments/:id`
- `POST /api/appointments/:id/cancel`
- `GET /api/availability?salonId=...&serviceId=...&date=YYYY-MM-DD&staffId=...`

### Webhook para Make

`POST /api/webhooks/make`

Si defines `WEBHOOK_SECRET`, debes firmar el body:

- Header: `X-Signature: sha256=<hex>`
- `<hex>` = HMAC-SHA256(body_raw, WEBHOOK_SECRET)

Intents soportados:
- `check_availability`
- `create_appointment`
- `cancel_appointment`

