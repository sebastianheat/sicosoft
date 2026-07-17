# psicologia.cl — Plataforma clínica con IA para psicólogos

Plataforma exclusiva para psicólogos (Chile, proyección internacional) que elimina el trabajo manual post-consulta: resumen de sesiones con IA, tests psicométricos con corrección automática, intranet del paciente y gestión financiera.

**Principio rector:** la IA nunca diagnostica sola. Todo output es un borrador que el profesional aprueba, corrige o rechaza (PRD §1).

## Stack

- **Next.js 16** (App Router, Server Actions) + TypeScript + Tailwind v4
- **Supabase**: Postgres + Auth + RLS (multi-tenancy por profesional)
- **Capa IA multi-modelo BYOK**: Anthropic / OpenAI / Google, key propia cifrada (AES-256-GCM por tenant)
- Deploy pensado para **Vercel**

## Qué está construido (MVP en curso)

| Módulo | Estado |
|---|---|
| M0 — Ficha clínica, timeline de sesiones, consentimientos separables, agenda con estados de cita | ✅ funcional |
| M1 — Sesiones: transcripción/notas → borrador IA → aprobar / corregir vía prompt / rechazar, con auditoría | ✅ funcional (integración Meet/Gemini pendiente) |
| M2 — Tests de libre uso: PHQ-9, GAD-7, Goldberg (EADG), AUDIT, ASSIST con corrección automática, subescalas, alertas de riesgo y motor declarativo | ✅ funcional |
| M2 — Observaciones obligatorias + "Corregir con IA" → informe borrador → aprobación con pie legal | ✅ funcional |
| M4 — Finanzas: cobro automático al marcar cita realizada, registro de pagos, resumen mensual | ✅ funcional (Fintoc pendiente) |
| M5 — Intranet paciente: próxima sesión + link Meet, responder tests, tareas, check-in de ánimo | ✅ funcional |
| Configuración: BYOK por proveedor, modelo por tarea, retención de audio (Ley 21.719) | ✅ funcional |
| Integraciones Google Calendar/Meet, Gemini STT, Fintoc, WhatsApp, Stripe | 🔜 siguientes pasos |
| M3 — Biblioteca de baremos por tenant (tests licenciados) | 🔜 Fase 1.5 (esquema de BD ya listo) |

## Puesta en marcha

### 1. Crear el proyecto Supabase (única acción manual imprescindible)

1. Crear un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecutar en orden:
   - `supabase/migrations/00001_schema_inicial.sql` (tablas + RLS)
   - `supabase/seed.sql` (catálogo de tests)
3. En **Authentication → Providers → Email**: desactivar "Confirm email" para el MVP (o configurar SMTP).
4. Copiar de **Settings → API**: la URL del proyecto y la `anon key`.

### 2. Variables de entorno

```bash
cp .env.example .env.local
# completar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
# generar la clave de cifrado BYOK:
openssl rand -base64 32   # → APP_ENCRYPTION_KEY
```

### 3. Ejecutar

```bash
npm install
npm run dev
```

Abrir http://localhost:3000 → **Crear cuenta profesional** → listo.

### Flujo de prueba rápido (criterios de éxito del MVP)

1. Registrarse como profesional y crear un paciente.
2. Registrar sus consentimientos (tratamiento / grabación / portal).
3. Agendar una cita, marcarla **Realizada** → se genera el cobro en Finanzas.
4. Abrir la sesión, pegar una transcripción → **Generar borrador con IA** → aprobar (requiere API key en Configuración).
5. Asignar un PHQ-9 → responderlo → registrar observaciones → **Corregir con IA** → aprobar informe (sale con pie legal).
6. Para probar la intranet: crear en Supabase Auth un usuario con metadata `{"rol": "paciente"}` y setear su `user_id` en la fila del paciente.

## Estructura

```
src/
  app/
    login, registro          → auth
    panel/                   → psicólogo: dashboard, agenda, pacientes,
                               sesiones, tests, finanzas, configuración
    portal/                  → paciente: próxima sesión, tests, tareas, ánimo
  lib/
    ai/                      → AIProvider (Anthropic·OpenAI·Google), prompts, BYOK
    tests/                   → motor declarativo + 5 instrumentos de libre uso
    actions/                 → server actions por módulo
    supabase/                → clientes SSR/browser
    crypto.ts                → AES-256-GCM por tenant
supabase/
  migrations/                → esquema completo con RLS
  seed.sql                   → catálogo de instrumentos
```

## Seguridad y cumplimiento (Ley 21.719)

- **RLS estricta**: cada tabla filtrada por tenant; el rol paciente solo ve sus citas (link Meet), tests, tareas y check-ins — nunca la ficha ni borradores.
- **Consentimientos separables** por finalidad; sin consentimiento de grabación la sesión no procesa audio.
- **BYOK cifrado** AES-256-GCM con clave derivada por tenant; nunca en logs.
- **Auditoría de IA**: qué modelo generó qué borrador y qué decidió el profesional.
- **Minimización**: borrado automático del audio al aprobar el resumen (configurable).
- Pie legal en informes: "Borrador generado con asistencia de IA. Revisado y aprobado por [profesional]".
