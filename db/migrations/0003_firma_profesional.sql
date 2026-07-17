-- Reunión 17-jul-2026: informes personalizables con firma digital.
-- La firma se guarda como data URL (imagen) y se estampa en los
-- informes aprobados junto al pie legal.

alter table profesionales add column firma_data text;
alter table profesionales add column membrete_texto text;
