import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { getPacienteActual } from "@/lib/actions/helpers";
import { responderTestComoPaciente } from "@/lib/actions/tests";
import { getTest } from "@/lib/tests";
import { Card, Titulo } from "@/components/ui";
import { TestPlayer } from "@/components/test-player";

export const dynamic = "force-dynamic";

export default async function ResponderTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paciente = await getPacienteActual();
  const supabase = await supabaseServer();

  const { data: aplicacion } = await supabase
    .from("tests_aplicaciones")
    .select("id, test_codigo, estado, paciente_id")
    .eq("id", id)
    .single();
  if (!aplicacion || aplicacion.paciente_id !== paciente.id) notFound();
  if (!["pendiente", "en_curso"].includes(aplicacion.estado)) {
    redirect("/portal?test=respondido");
  }

  const def = getTest(aplicacion.test_codigo);
  if (!def) notFound();

  const responder = responderTestComoPaciente.bind(null, id);

  return (
    <>
      <div>
        <Titulo>{def.nombreCorto}</Titulo>
        <p className="text-sm text-ink/60">{def.nombre}</p>
      </div>
      <Card>
        <TestPlayer def={def} action={responder} />
      </Card>
      <p className="text-xs text-ink/40">
        Tus respuestas solo las ve tu psicólogo/a, quien las revisará contigo.
      </p>
    </>
  );
}
