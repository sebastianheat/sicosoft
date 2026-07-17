import Link from "next/link";
import { Card, Subtitulo, Titulo } from "@/components/ui";

export const dynamic = "force-static";

/**
 * Tutorial de integración Google (reunión 17-jul): guía paso a paso,
 * "lo más simple posible", para habilitar la grabación y transcripción
 * de sesiones con Meet + Gemini.
 */
export default function TutorialGooglePage() {
  return (
    <>
      <div>
        <Titulo>Configura Google para grabar tus sesiones</Titulo>
        <p className="text-sm text-ink/60">
          Con esto tus sesiones por Meet quedan grabadas y transcritas
          automáticamente, listas para el resumen con IA.
        </p>
      </div>

      <Card>
        <Subtitulo>¿Qué necesitas?</Subtitulo>
        <p className="mt-2 text-sm text-ink/80">
          La grabación y transcripción automática con Gemini requiere una
          cuenta de Google con plan pagado. Sirve cualquiera de estas dos:
        </p>
        <ul className="mt-3 space-y-2 text-sm text-ink/80">
          <li className="rounded-lg bg-accent-soft/20 p-3">
            <strong>Opción A — Gmail personal con Google AI Pro:</strong> tu
            cuenta @gmail.com de siempre, contratando el plan &ldquo;Google AI
            Pro&rdquo;. Habilita la toma de notas con Gemini en Meet.
          </li>
          <li className="rounded-lg bg-accent-soft/20 p-3">
            <strong>Opción B — Google Workspace (recomendada):</strong> cuenta
            de empresa (ej: contacto@tuconsulta.cl) con plan Business Standard
            o superior. Da más permisos: además de la transcripción, permite
            que tus pacientes también accedan a funciones de la llamada.
          </li>
        </ul>
      </Card>

      <Card>
        <Subtitulo>Paso a paso</Subtitulo>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm text-ink/80">
          <li>
            <strong>Contrata el plan.</strong> Opción A: entra a{" "}
            <span className="font-mono text-xs">one.google.com/ai</span> y
            activa Google AI Pro. Opción B: entra a{" "}
            <span className="font-mono text-xs">workspace.google.com</span> y
            contrata Business Standard.
          </li>
          <li>
            <strong>Activa Gemini en Meet.</strong> En una videollamada de
            prueba, abre el ícono de lápiz (&ldquo;Tomar notas con
            Gemini&rdquo;) arriba a la derecha y actívalo. Ahí mismo puedes
            activar la grabación.
          </li>
          <li>
            <strong>Verifica el idioma.</strong> En la configuración de la
            toma de notas, selecciona español para que la transcripción salga
            correcta.
          </li>
          <li>
            <strong>Registra el consentimiento del paciente</strong> en su
            ficha (sección Consentimientos) antes de grabar cualquier sesión —
            es obligatorio por la Ley 21.719 y el sistema te lo recordará.
          </li>
          <li>
            <strong>Después de la sesión</strong>, Google deja las notas y la
            transcripción en tu Drive. Pégala en la sesión correspondiente
            (Agenda → Abrir sesión) y presiona{" "}
            <em>&ldquo;Generar borrador de resumen con IA&rdquo;</em>. La
            recuperación automática desde Drive es la siguiente integración en
            camino.
          </li>
        </ol>
      </Card>

      <Card>
        <Subtitulo>¿Y si no tengo plan pagado?</Subtitulo>
        <p className="mt-2 text-sm text-ink/80">
          Puedes usar el sistema igual: después de cada sesión escribe o dicta
          tus notas en la sesión y genera el resumen con IA a partir de ellas.
          El flujo manual siempre está disponible — la plataforma nunca depende
          de que la grabación funcione.
        </p>
      </Card>

      <Link href="/panel/configuracion" className="text-sm text-primary hover:underline">
        ← Volver a Configuración
      </Link>
    </>
  );
}
