# sicologia.app — Plataforma clínica con IA para psicólogos

Plataforma exclusiva para psicólogos (Chile, proyección internacional) que elimina el trabajo manual post-consulta: resumen de sesiones con IA, tests psicométricos con corrección automática, intranet del paciente y gestión financiera.

**Principio rector:** la IA nunca diagnostica sola. Todo output es un borrador que el profesional aprueba, corrige o rechaza (PRD §1).

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind v4
- **Postgres** (Neon u otra base conectada vía Vercel) con aislamiento multi-tenant en la capa de datos
- **Auth propia**: JWT (jose) en cookie httpOnly + bcrypt, roles `profesional` / `paciente`
- **Capa IA multi-modelo BYOK**: Anthropic / OpenAI / Google, key propia cifrada (AES-256-GCM por tenant)
- Deploy en **Vercel**

## Qué está construido (MVP en curso)

| Módulo | Estado |
|---|---|
| M0 — Ficha clínica, timeline de sesiones, consentimientos separables, agenda con estados de cita | ✅ funcional |
| M1 — Sesiones: transcripción/notas → borrador IA → aprobar / corregir vía prompt / rechazar, con auditoría | ✅ funcional (integración Meet/Gemini pendiente) |
| M2 — Tests de libre uso: PHQ-9, GAD-7, Goldberg (EADG), AUDIT, ASSIST con corrección automática, subescalas, alertas de riesgo y motor declarativo | ✅ funcional |
| M2 — Observaciones obligatorias + "Corregir con IA" → informe borrador → aprobación con pie legal | ✅ funcional |
| M4 — Finanzas: cobro automático al marcar cita realizada, registro de pagos, resumen mensual | ✅ funcional (Fintoc pendiente) |
| M5 — Intranet paciente: próxima sesión + link Meet, responder tests, tareas, check-in de ánimo, creación de acceso desde la ficha | ✅ funcional |
| Configuración: BYOK por proveedor, modelo por tarea, retención de audio (Ley 21.719) | ✅ funcional |
| Informe formal imprimible/PDF con membrete y **firma digital** del profesional (reunión 17-jul) | ✅ funcional |
| Alertas de ánimo bajo en el dashboard + tutorial de integración Google (`/panel/ayuda/google`) | ✅ funcional |
| Integraciones Google Calendar/Meet, Gemini STT, Fintoc, WhatsApp, Stripe | 🔜 siguientes pasos |
| M3 — Biblioteca de baremos por tenant (tests licenciados) | 🔜 Fase 1.5 (esquema de BD ya listo) |

Todo el flujo está verificado con una prueba e2e real (`scripts/e2e.mjs`): registro → paciente → consentimientos → cita → cobro → sesión → PHQ-9 corregido → portal del paciente → aislamiento entre tenants.

## Puesta en marcha

### En Vercel (recomendado)

1. Importar este repo como proyecto en Vercel.
2. **Storage → Create/Connect Database → Neon** (u otra Postgres): esto inyecta `DATABASE_URL` sola.
3. Agregar en Environment Variables:
   - `AUTH_SECRET` → `openssl rand -base64 32`
   - `APP_ENCRYPTION_KEY` → `openssl rand -base64 32`
4. Aplicar el esquema (una vez): local con la misma URL de Neon:
   ```bash
   DATABASE_URL="postgres://…neon…" npm run db:migrate
   ```
5. Deploy. Registrarse en `/registro` y listo.

### En local

```bash
npm install
cp .env.example .env.local   # completar DATABASE_URL, AUTH_SECRET, APP_ENCRYPTION_KEY
npm run db:migrate
npm run dev
```

### Flujo de prueba rápido (criterios de éxito del MVP)

1. Registrarse como profesional y crear un paciente.
2. Registrar sus consentimientos (tratamiento / grabación / portal).
3. Agendar una cita, marcarla **Realizada** → se genera el cobro en Finanzas.
4. Abrir la sesión, pegar una transcripción → **Generar borrador con IA** → aprobar (requiere API key en Configuración).
5. Asignar un PHQ-9 → responderlo → registrar observaciones → **Corregir con IA** → aprobar informe (sale con pie legal).
6. En la ficha, **crear el acceso a la intranet** del paciente: entra en `/login` con su email y ve su próxima sesión, tests y tareas.

## Estructura

```
src/
  app/
    login, registro          → auth (roles profesional/paciente)
    panel/                   → psicólogo: dashboard, agenda, pacientes,
                               sesiones, tests, finanzas, configuración
    portal/                  → paciente: próxima sesión, tests, tareas, ánimo
  lib/
    ai/                      → AIProvider (Anthropic·OpenAI·Google), prompts, BYOK
    tests/                   → motor declarativo + 5 instrumentos de libre uso
    actions/                 → server actions por módulo + guardas de tenant
    auth/                    → sesión JWT (cookie httpOnly)
    db.ts                    → cliente Postgres (conexión perezosa)
    crypto.ts                → AES-256-GCM por tenant
db/migrations/               → esquema versionado (runner: npm run db:migrate)
scripts/
  migrate.mjs                → migraciones idempotentes
  e2e.mjs                    → prueba end-to-end del MVP (Playwright)
```

## Seguridad y cumplimiento (Ley 21.719)

- **Aislamiento multi-tenant en la capa de datos**: toda consulta se filtra por `profesional_id` derivado de la sesión; toda acción verifica pertenencia del recurso antes de tocarlo (guardas en `lib/actions/helpers.ts`). Verificado por e2e: otro profesional no ve pacientes ajenos (404) y el rol paciente no entra al panel.
- **Consentimientos separables** por finalidad; sin consentimiento de grabación la sesión no procesa audio.
- **BYOK cifrado** AES-256-GCM con clave derivada por tenant; nunca en logs.
- **Auditoría de IA**: qué modelo generó qué borrador y qué decidió el profesional.
- **Minimización**: borrado automático del audio al aprobar el resumen (configurable).
- Pie legal en informes: "Borrador generado con asistencia de IA. Revisado y aprobado por [profesional]".
