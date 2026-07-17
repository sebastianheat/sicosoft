-- Seed: registro de instrumentos de libre uso (M2 v1).
-- La definición completa (ítems, escalas, rangos) vive en el código
-- (src/lib/tests) como fuente de verdad del MVP; esta tabla mantiene
-- la integridad referencial y el catálogo consultable.

insert into tests_definiciones (codigo, nombre, tipo, esquema_json, rangos_severidad) values
  ('PHQ9',     'Cuestionario de Salud del Paciente — 9 (PHQ-9)',                        'libre', '{"fuente_codigo": "src/lib/tests/instruments/phq9.ts"}',     '[{"min":0,"max":4,"etiqueta":"mínima"},{"min":5,"max":9,"etiqueta":"leve"},{"min":10,"max":14,"etiqueta":"moderada"},{"min":15,"max":19,"etiqueta":"moderadamente severa"},{"min":20,"max":27,"etiqueta":"severa"}]'),
  ('GAD7',     'Escala de Ansiedad Generalizada — 7 (GAD-7)',                           'libre', '{"fuente_codigo": "src/lib/tests/instruments/gad7.ts"}',     '[{"min":0,"max":4,"etiqueta":"mínima"},{"min":5,"max":9,"etiqueta":"leve"},{"min":10,"max":14,"etiqueta":"moderada"},{"min":15,"max":21,"etiqueta":"severa"}]'),
  ('GOLDBERG', 'Escala de Ansiedad y Depresión de Goldberg (EADG)',                     'libre', '{"fuente_codigo": "src/lib/tests/instruments/goldberg.ts"}', '[]'),
  ('AUDIT',    'Test de Identificación de Trastornos por Consumo de Alcohol (OMS)',     'libre', '{"fuente_codigo": "src/lib/tests/instruments/audit.ts"}',    '[{"min":0,"max":7,"etiqueta":"bajo riesgo"},{"min":8,"max":15,"etiqueta":"riesgo"},{"min":16,"max":19,"etiqueta":"perjudicial"},{"min":20,"max":40,"etiqueta":"posible dependencia"}]'),
  ('ASSIST',   'Prueba de Detección de Consumo de Alcohol, Tabaco y Sustancias (OMS)',  'libre', '{"fuente_codigo": "src/lib/tests/instruments/assist.ts"}',   '[]')
on conflict (codigo) do nothing;
