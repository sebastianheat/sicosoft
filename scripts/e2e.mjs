// Prueba e2e del MVP. Requiere: npm i -D playwright · app corriendo en :3100
// contra una base limpia. Uso: node scripts/e2e.mjs
import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const ok = (paso) => console.log(`✓ ${paso}`);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

try {
  const page = await browser.newPage();

  // 1. Registro de profesional
  await page.goto(`${BASE}/registro`);
  await page.fill('input[name="nombre"]', "Diego Yañez");
  await page.fill('input[name="n_registro"]', "123456");
  await page.fill('input[name="email"]', "diego@test.cl");
  await page.fill('input[name="password"]', "clave-segura-1");
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/panel`, { timeout: 15000 });
  ok("Registro profesional → dashboard");

  // 2. Crear paciente
  await page.goto(`${BASE}/panel/pacientes?nuevo=1`);
  await page.fill('input[name="nombre"]', "María Prueba");
  await page.fill('input[name="rut"]', "12.345.678-9");
  await page.fill('textarea[name="motivo_consulta"]', "Sintomatología ansiosa");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/panel\/pacientes\/[0-9a-f-]+/, { timeout: 15000 });
  const fichaUrl = page.url();
  ok("Paciente creado → ficha");

  // 3. Consentimientos (tratamiento + grabación)
  await page.selectOption('select[name="tipo"]', "tratamiento");
  await page.click('button[name="aceptado"][value="si"]');
  await page.waitForTimeout(1200);
  await page.selectOption('select[name="tipo"]', "grabacion");
  await page.click('button[name="aceptado"][value="si"]');
  await page.waitForTimeout(1200);
  const badges = await page.locator("text=Aceptado").count();
  if (badges < 2) throw new Error("Consentimientos no registrados");
  ok("Consentimientos tratamiento + grabación aceptados");

  // 4. Crear acceso intranet del paciente
  await page.fill('input[name="email"][type="email"]', "maria@test.cl");
  await page.fill('input[name="password"][type="text"]', "clave-paciente-1");
  await page.click('text=Crear acceso');
  await page.waitForSelector("text=Acceso activo", { timeout: 10000 });
  ok("Login de intranet del paciente creado");

  // 5. Agendar cita online con valor
  await page.goto(`${BASE}/panel/agenda?nueva=1`);
  await page.selectOption('select[name="paciente_id"]', { label: "María Prueba" });
  const manana = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  await page.fill('input[name="fecha"]', manana);
  await page.fill('input[name="hora"]', "10:00");
  await page.fill('input[name="valor"]', "40000");
  await page.fill('input[name="meet_link"]', "https://meet.google.com/abc-defg-hij");
  await page.click('button:has-text("Agendar")');
  await page.waitForURL(`${BASE}/panel/agenda`, { timeout: 15000 });
  ok("Cita agendada");

  // 6. Marcar realizada → genera cobro
  await page.click('button:has-text("Realizada")');
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/panel/finanzas`);
  await page.waitForSelector("text=María Prueba · $40.000", { timeout: 10000 });
  ok("Cobro automático generado en Finanzas");

  // 7. Marcar pagado
  await page.click('button:has-text("Marcar pagado")');
  await page.waitForTimeout(1500);
  const pagado = await page.locator("text=pagado").count();
  if (!pagado) throw new Error("Pago no registrado");
  ok("Pago registrado");

  // 8. Abrir sesión y guardar transcripción
  await page.goto(`${BASE}/panel/agenda`);
  await page.click('button:has-text("Abrir sesión")');
  await page.waitForURL(/\/panel\/sesiones\/[0-9a-f-]+/, { timeout: 15000 });
  await page.fill('textarea[name="transcripcion"]', "Paciente relata mejoría del ánimo esta semana. Se trabajó reestructuración cognitiva.");
  await page.click('button:has-text("Guardar")');
  await page.waitForSelector('text=Generar borrador de resumen con IA', { timeout: 10000 });
  ok("Sesión abierta y transcripción guardada (botón IA visible)");

  // 9. Asignar PHQ-9 y responderlo como profesional (modo manual)
  await page.goto(`${BASE}/panel/tests?asignar=1`);
  await page.selectOption('select[name="paciente_id"]', { label: "María Prueba" });
  await page.selectOption('select[name="test_codigo"]', "PHQ9");
  await page.click('button:has-text("Asignar")');
  await page.waitForURL(`${BASE}/panel/tests`, { timeout: 15000 });
  await page.click("text=PHQ-9");
  await page.waitForURL(/\/panel\/tests\/[0-9a-f-]+/, { timeout: 15000 });
  // responder: opción "Más de la mitad de los días" (valor 2) en todos
  const radios = page.locator('input[type="radio"][value="2"]');
  const n = await radios.count();
  for (let i = 0; i < n; i++) await radios.nth(i).check({ force: true });
  await page.click('button:has-text("Enviar respuestas")');
  await page.waitForSelector("text=Resultados", { timeout: 15000 });
  const puntaje = await page.locator("p.text-4xl").textContent();
  if (puntaje?.trim() !== "18") throw new Error(`Puntaje esperado 18, obtenido ${puntaje}`);
  await page.waitForSelector("text=Depresión moderadamente severa");
  ok("PHQ-9 respondido: puntaje 18 · moderadamente severa ✓ corrección automática");

  // 10. Observaciones del profesional
  await page.fill('textarea[name="observaciones"]', "Paciente colaboradora, aplicación supervisada en vivo.");
  await page.click('button:has-text("Guardar observaciones")');
  await page.waitForSelector('text=Corregir con IA', { timeout: 10000 });
  ok("Observaciones guardadas (botón Corregir con IA habilitado)");

  // 11. Segunda cita futura (la primera quedó realizada) para el portal
  await page.goto(`${BASE}/panel/agenda?nueva=1`);
  await page.selectOption('select[name="paciente_id"]', { label: "María Prueba" });
  const pasado = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  await page.fill('input[name="fecha"]', pasado);
  await page.fill('input[name="hora"]', "11:00");
  await page.fill('input[name="meet_link"]', "https://meet.google.com/xyz-1234-abc");
  await page.click('button:has-text("Agendar")');
  await page.waitForURL(`${BASE}/panel/agenda`, { timeout: 15000 });

  // Portal del paciente: login, ver Meet link, responder GAD-7, check-in
  await page.goto(`${BASE}/panel/tests?asignar=1`);
  await page.selectOption('select[name="paciente_id"]', { label: "María Prueba" });
  await page.selectOption('select[name="test_codigo"]', "GAD7");
  await page.click('button:has-text("Asignar")');
  await page.waitForURL(`${BASE}/panel/tests`, { timeout: 15000 });

  const pagePac = await browser.newPage();
  await pagePac.goto(`${BASE}/login`);
  await pagePac.fill('input[name="email"]', "maria@test.cl");
  await pagePac.fill('input[name="password"]', "clave-paciente-1");
  await pagePac.click('button[type="submit"]');
  await pagePac.waitForURL(`${BASE}/portal`, { timeout: 15000 });
  await pagePac.waitForSelector("text=Entrar a la sesión (Meet)");
  ok("Paciente entra al portal y ve el botón de Meet");

  await pagePac.click("text=Responder");
  await pagePac.waitForURL(/\/portal\/tests\//, { timeout: 15000 });
  const radiosG = pagePac.locator('input[type="radio"][value="1"]');
  const ng = await radiosG.count();
  for (let i = 0; i < ng; i++) await radiosG.nth(i).check({ force: true });
  await pagePac.click('button:has-text("Enviar respuestas")');
  await pagePac.waitForURL(/portal\?test=respondido/, { timeout: 15000 });
  ok("Paciente respondió GAD-7 desde su intranet");

  // check-in de ánimo
  await pagePac.locator('input[name="valor"][value="4"]').check({ force: true });
  await pagePac.fill('input[name="nota"]', "Buen día en general");
  await pagePac.click('button:has-text("Registrar")');
  await pagePac.waitForSelector("text=Ya registraste tu ánimo hoy", { timeout: 10000 });
  ok("Check-in de ánimo registrado");

  // 12. Aislamiento: el paciente no puede entrar al panel
  await pagePac.goto(`${BASE}/panel`);
  await pagePac.waitForURL(`${BASE}/portal`, { timeout: 10000 });
  ok("Rol paciente redirigido fuera del panel profesional");

  // 13. Aislamiento entre tenants: otro profesional no ve a María
  const page2 = await browser.newPage();
  await page2.goto(`${BASE}/registro`);
  await page2.fill('input[name="nombre"]', "Otra Psicóloga");
  await page2.fill('input[name="email"]', "otra@test.cl");
  await page2.fill('input[name="password"]', "clave-segura-2");
  await page2.click('button[type="submit"]');
  await page2.waitForURL(`${BASE}/panel`, { timeout: 15000 });
  await page2.goto(`${BASE}/panel/pacientes`);
  const veMaria = await page2.locator("text=María Prueba").count();
  if (veMaria > 0) throw new Error("FUGA ENTRE TENANTS: otro profesional ve al paciente");
  await page2.goto(fichaUrl);
  const notFound = await page2.locator("text=404").count();
  if (!notFound) throw new Error("FUGA: la ficha ajena no devolvió 404");
  ok("Aislamiento multi-tenant verificado (lista vacía + ficha ajena 404)");

  console.log("\n★ E2E COMPLETO: todos los flujos del MVP funcionan");
} finally {
  await browser.close();
}
