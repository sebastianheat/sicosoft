-- ============================================================
-- psicologia.cl — Esquema inicial (PRD §6)
-- Multi-tenancy por profesional con Row Level Security.
-- Roles: 'profesional' (titular del tenant) y 'paciente'
-- (login restringido a la intranet del paciente).
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Profesionales (tenant raíz)
-- ------------------------------------------------------------
create table profesionales (
  id                      uuid primary key default uuid_generate_v4(),
  user_id                 uuid not null unique references auth.users (id) on delete cascade,
  nombre                  text not null,
  rut                     text,
  n_registro              text,
  especialidad            text,
  -- API keys BYOK cifradas a nivel de aplicación (AES-256-GCM),
  -- jamás en texto plano. { anthropic?: {...}, openai?: {...}, google?: {...} }
  api_keys_cifradas       jsonb not null default '{}'::jsonb,
  -- Preferencias de IA: modelo por tarea (transcripción, resumen, informes)
  config_ia               jsonb not null default '{}'::jsonb,
  -- Minimización de datos (Ley 21.719): borrar audio tras aprobar resumen
  config_retencion_audio  jsonb not null default '{"eliminar_audio_al_aprobar": true}'::jsonb,
  created_at              timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Pacientes
-- ------------------------------------------------------------
create table pacientes (
  id               uuid primary key default uuid_generate_v4(),
  profesional_id   uuid not null references profesionales (id) on delete cascade,
  -- login opcional a la intranet del paciente
  user_id          uuid unique references auth.users (id) on delete set null,
  nombre           text not null,
  rut              text,
  email            text,
  telefono         text,
  fecha_nacimiento date,
  datos_personales jsonb not null default '{}'::jsonb,
  motivo_consulta  text,
  -- cifrada a nivel de aplicación además del cifrado en reposo
  anamnesis        text,
  estado           text not null default 'activo' check (estado in ('activo', 'alta', 'inactivo')),
  created_at       timestamptz not null default now()
);
create index pacientes_profesional_idx on pacientes (profesional_id);

-- ------------------------------------------------------------
-- Consentimientos informados (separables por finalidad)
-- ------------------------------------------------------------
create table consentimientos (
  id            uuid primary key default uuid_generate_v4(),
  paciente_id   uuid not null references pacientes (id) on delete cascade,
  tipo          text not null check (tipo in ('tratamiento', 'grabacion', 'portal')),
  aceptado      boolean not null,
  fecha         timestamptz not null default now(),
  ip            text,
  version_texto text not null,
  unique (paciente_id, tipo, version_texto)
);
create index consentimientos_paciente_idx on consentimientos (paciente_id);

-- ------------------------------------------------------------
-- Citas / agenda
-- ------------------------------------------------------------
create table citas (
  id                     uuid primary key default uuid_generate_v4(),
  paciente_id            uuid not null references pacientes (id) on delete cascade,
  fecha                  timestamptz not null,
  duracion_min           integer not null default 50,
  estado                 text not null default 'agendada'
                         check (estado in ('agendada', 'confirmada', 'realizada', 'inasistencia', 'cancelada')),
  tipo                   text not null default 'online' check (tipo in ('online', 'presencial')),
  valor                  integer not null default 0,
  gcal_event_id          text,
  meet_link              text,
  recordatorios_enviados jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now()
);
create index citas_paciente_idx on citas (paciente_id);
create index citas_fecha_idx on citas (fecha);

-- ------------------------------------------------------------
-- Sesiones: transcripción y pipeline de aprobación humana
-- ------------------------------------------------------------
create table sesiones (
  id                   uuid primary key default uuid_generate_v4(),
  cita_id              uuid not null unique references citas (id) on delete cascade,
  audio_url            text,
  transcripcion        text, -- cifrada a nivel de aplicación
  borrador_ia          text,
  resumen_aprobado     text,
  ideas_proxima_sesion text,
  estado               text not null default 'pendiente'
                       check (estado in ('pendiente', 'borrador', 'aprobado', 'rechazado')),
  modelo_ia_usado      text,
  aprobado_at          timestamptz,
  created_at           timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Documentos adjuntos (por paciente y opcionalmente por sesión)
-- ------------------------------------------------------------
create table documentos (
  id          uuid primary key default uuid_generate_v4(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  sesion_id   uuid references sesiones (id) on delete set null,
  tipo        text not null default 'otro'
              check (tipo in ('protocolo_test', 'informe_externo', 'certificado', 'otro')),
  nombre      text not null,
  formato     text,
  storage_url text not null,
  subido_at   timestamptz not null default now()
);
create index documentos_paciente_idx on documentos (paciente_id);

-- ------------------------------------------------------------
-- Base de conocimiento de corrección (M3)
-- capa 'sistema': global, curada por el equipo (solo lectura para tenants)
-- capa 'editorial': tratamiento según PRD §8.1 (no precargada)
-- ------------------------------------------------------------
create table kb_correccion (
  id             uuid primary key default uuid_generate_v4(),
  test_codigo    text not null,
  capa           text not null check (capa in ('sistema', 'editorial')),
  contenido_json jsonb not null,
  fuente         text,
  version        text not null default '1',
  curado_por     text,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Biblioteca privada de baremos por tenant (M3)
-- Cada profesional sube las tablas de los manuales que compró.
-- Jamás se comparten entre tenants.
-- ------------------------------------------------------------
create table baremos_kb (
  id                        uuid primary key default uuid_generate_v4(),
  profesional_id            uuid not null references profesionales (id) on delete cascade,
  test_codigo               text not null,
  nombre_manual             text not null,
  fuente_original_url       text,
  datos_estructurados_json  jsonb not null,
  validado_por_profesional  boolean not null default false,
  created_at                timestamptz not null default now()
);
create index baremos_profesional_idx on baremos_kb (profesional_id);

-- ------------------------------------------------------------
-- Plantillas de informe por profesional
-- ------------------------------------------------------------
create table plantillas_informe (
  id              uuid primary key default uuid_generate_v4(),
  profesional_id  uuid not null references profesionales (id) on delete cascade,
  tipo            text not null check (tipo in ('test', 'derivacion', 'sesion')),
  nombre          text not null,
  estructura_json jsonb not null default '{}'::jsonb,
  membrete        text,
  created_at      timestamptz not null default now()
);
create index plantillas_profesional_idx on plantillas_informe (profesional_id);

-- ------------------------------------------------------------
-- Motor de tests declarativo (M2)
-- ------------------------------------------------------------
create table tests_definiciones (
  codigo           text primary key,
  nombre           text not null,
  tipo             text not null check (tipo in ('libre', 'licenciado')),
  esquema_json     jsonb not null, -- preguntas, escalas, opciones
  tiempos          jsonb,          -- temporizadores si el instrumento lo requiere
  rangos_severidad jsonb not null default '[]'::jsonb,
  activo           boolean not null default true
);

create table tests_aplicaciones (
  id                       uuid primary key default uuid_generate_v4(),
  paciente_id              uuid not null references pacientes (id) on delete cascade,
  test_codigo              text not null references tests_definiciones (codigo),
  sesion_id                uuid references sesiones (id) on delete set null,
  aplicado_via             text not null default 'vivo_supervisado'
                           check (aplicado_via in ('vivo_supervisado', 'presesion', 'documento', 'manual')),
  respuestas               jsonb not null default '{}'::jsonb,
  puntaje_total            numeric,
  subescalas               jsonb,
  severidad                text,
  observaciones_profesional text,
  interpretacion_borrador  text,
  interpretacion_aprobada  text,
  estado                   text not null default 'pendiente'
                           check (estado in ('pendiente', 'en_curso', 'respondido', 'corregido', 'aprobado')),
  documento_id             uuid references documentos (id) on delete set null,
  asignado_at              timestamptz not null default now(),
  respondido_at            timestamptz,
  aprobado_at              timestamptz
);
create index tests_aplicaciones_paciente_idx on tests_aplicaciones (paciente_id);

-- ------------------------------------------------------------
-- Intranet paciente: tareas y check-ins (estructura lista; capa IA en Fase 2)
-- ------------------------------------------------------------
create table tareas_paciente (
  id          uuid primary key default uuid_generate_v4(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  descripcion text not null,
  origen      text not null default 'manual' check (origen in ('manual', 'ia')),
  estado      text not null default 'pendiente' check (estado in ('pendiente', 'cumplida', 'descartada')),
  created_at  timestamptz not null default now(),
  cumplida_at timestamptz
);
create index tareas_paciente_idx on tareas_paciente (paciente_id);

create table checkins_animo (
  id          uuid primary key default uuid_generate_v4(),
  paciente_id uuid not null references pacientes (id) on delete cascade,
  fecha       date not null default current_date,
  valor       integer not null check (valor between 1 and 5),
  nota        text,
  created_at  timestamptz not null default now(),
  unique (paciente_id, fecha)
);

-- ------------------------------------------------------------
-- Finanzas (M4)
-- ------------------------------------------------------------
create table pagos (
  id                uuid primary key default uuid_generate_v4(),
  cita_id           uuid not null references citas (id) on delete cascade,
  monto             integer not null,
  estado            text not null default 'pendiente'
                    check (estado in ('pendiente', 'parcial', 'pagado', 'anulado')),
  metodo            text check (metodo in ('transferencia', 'efectivo', 'tarjeta', 'otro')),
  conciliado_fintoc boolean not null default false,
  transferencia_id  text,
  pagado_at         timestamptz,
  created_at        timestamptz not null default now()
);
create index pagos_cita_idx on pagos (cita_id);

-- ------------------------------------------------------------
-- Informes de derivación (M6 — Fase 2, estructura lista)
-- ------------------------------------------------------------
create table informes (
  id                uuid primary key default uuid_generate_v4(),
  paciente_id       uuid not null references pacientes (id) on delete cascade,
  tipo_destinatario text not null check (tipo_destinatario in ('legal', 'escolar', 'profesional', 'isapre', 'otro')),
  borrador          text,
  version_final     text,
  estado            text not null default 'borrador' check (estado in ('borrador', 'aprobado')),
  created_at        timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Auditoría de IA: qué modelo generó qué, y qué hizo el profesional
-- ------------------------------------------------------------
create table auditoria_ia (
  id             uuid primary key default uuid_generate_v4(),
  profesional_id uuid not null references profesionales (id) on delete cascade,
  recurso        text not null, -- ej: 'sesion:<id>', 'test_aplicacion:<id>'
  modelo         text not null,
  tokens_input   integer,
  tokens_output  integer,
  accion         text not null check (accion in ('generado', 'corregido', 'aprobado', 'rechazado')),
  timestamp      timestamptz not null default now()
);
create index auditoria_profesional_idx on auditoria_ia (profesional_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- Helper: tenant del usuario autenticado (null si no es profesional)
create or replace function public.profesional_actual_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from profesionales where user_id = auth.uid()
$$;

-- Helper: id de paciente del usuario autenticado (null si no es paciente)
create or replace function public.paciente_actual_id()
returns uuid
language sql stable security definer set search_path = public as $$
  select id from pacientes where user_id = auth.uid()
$$;

alter table profesionales      enable row level security;
alter table pacientes          enable row level security;
alter table consentimientos    enable row level security;
alter table citas              enable row level security;
alter table sesiones           enable row level security;
alter table documentos         enable row level security;
alter table kb_correccion      enable row level security;
alter table baremos_kb         enable row level security;
alter table plantillas_informe enable row level security;
alter table tests_definiciones enable row level security;
alter table tests_aplicaciones enable row level security;
alter table tareas_paciente    enable row level security;
alter table checkins_animo     enable row level security;
alter table pagos              enable row level security;
alter table informes           enable row level security;
alter table auditoria_ia       enable row level security;

-- Profesionales: solo su propia fila
create policy profesional_self on profesionales
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Pacientes: el profesional ve/gestiona los suyos; el paciente ve SOLO
-- sus datos básicos (la ficha clínica nunca se expone por la app al rol paciente)
create policy pacientes_tenant on pacientes
  for all using (profesional_id = profesional_actual_id())
  with check (profesional_id = profesional_actual_id());
create policy pacientes_self_read on pacientes
  for select using (user_id = auth.uid());

-- Consentimientos: tenant completo; el paciente puede ver y registrar los suyos
create policy consentimientos_tenant on consentimientos
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));
create policy consentimientos_paciente on consentimientos
  for select using (paciente_id = paciente_actual_id());
create policy consentimientos_paciente_insert on consentimientos
  for insert with check (paciente_id = paciente_actual_id());

-- Citas: tenant completo; el paciente solo lee sus citas (fecha + link de Meet)
create policy citas_tenant on citas
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));
create policy citas_paciente_read on citas
  for select using (paciente_id = paciente_actual_id());

-- Sesiones: SOLO el profesional. El paciente jamás accede a borradores ni resúmenes.
create policy sesiones_tenant on sesiones
  for all using (cita_id in (
    select c.id from citas c
    join pacientes p on p.id = c.paciente_id
    where p.profesional_id = profesional_actual_id()))
  with check (cita_id in (
    select c.id from citas c
    join pacientes p on p.id = c.paciente_id
    where p.profesional_id = profesional_actual_id()));

-- Documentos: solo el profesional
create policy documentos_tenant on documentos
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));

-- KB de corrección: capa sistema legible por cualquier profesional autenticado;
-- solo service_role escribe (curaduría del equipo)
create policy kb_sistema_read on kb_correccion
  for select using (capa = 'sistema' and profesional_actual_id() is not null);

-- Baremos: biblioteca privada estricta por tenant
create policy baremos_tenant on baremos_kb
  for all using (profesional_id = profesional_actual_id())
  with check (profesional_id = profesional_actual_id());

-- Plantillas: por tenant
create policy plantillas_tenant on plantillas_informe
  for all using (profesional_id = profesional_actual_id())
  with check (profesional_id = profesional_actual_id());

-- Definiciones de tests: lectura para todo usuario autenticado
-- (el paciente necesita las preguntas para responder)
create policy tests_definiciones_read on tests_definiciones
  for select using (auth.uid() is not null);

-- Aplicaciones de tests: tenant completo; el paciente ve las suyas y
-- responde (update restringido por columna vía API — nunca toca la interpretación)
create policy tests_aplicaciones_tenant on tests_aplicaciones
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));
create policy tests_aplicaciones_paciente_read on tests_aplicaciones
  for select using (paciente_id = paciente_actual_id());
create policy tests_aplicaciones_paciente_update on tests_aplicaciones
  for update using (paciente_id = paciente_actual_id() and estado in ('pendiente', 'en_curso'))
  with check (paciente_id = paciente_actual_id());

-- Tareas: tenant completo; paciente lee y marca cumplimiento
create policy tareas_tenant on tareas_paciente
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));
create policy tareas_paciente_read on tareas_paciente
  for select using (paciente_id = paciente_actual_id());
create policy tareas_paciente_update on tareas_paciente
  for update using (paciente_id = paciente_actual_id())
  with check (paciente_id = paciente_actual_id());

-- Check-ins de ánimo: el paciente registra los suyos; el profesional los lee
create policy checkins_tenant_read on checkins_animo
  for select using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));
create policy checkins_paciente on checkins_animo
  for all using (paciente_id = paciente_actual_id())
  with check (paciente_id = paciente_actual_id());

-- Pagos e informes: solo el profesional
create policy pagos_tenant on pagos
  for all using (cita_id in (
    select c.id from citas c
    join pacientes p on p.id = c.paciente_id
    where p.profesional_id = profesional_actual_id()))
  with check (cita_id in (
    select c.id from citas c
    join pacientes p on p.id = c.paciente_id
    where p.profesional_id = profesional_actual_id()));

create policy informes_tenant on informes
  for all using (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()))
  with check (paciente_id in (select id from pacientes where profesional_id = profesional_actual_id()));

-- Auditoría IA: el profesional ve su propio registro; inserta la API
create policy auditoria_tenant on auditoria_ia
  for all using (profesional_id = profesional_actual_id())
  with check (profesional_id = profesional_actual_id());

-- ============================================================
-- Storage: bucket privado para audios y documentos
-- (crear buckets 'audios' y 'documentos' privados desde el dashboard
--  o CLI; URLs firmadas de corta duración desde la API)
-- ============================================================
