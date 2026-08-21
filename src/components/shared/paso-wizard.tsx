"use client";

/**
 * Cabecera de un paso del wizard.
 *
 * La barra de progreso solo se dibuja si `total` es mayor que 1. Hoy únicamente
 * existe el paso 1 —los demás llegan con las tareas 2.3 a 2.5— y anunciar "1 de
 * 5" prometía un recorrido que al guardar no continuaba: devolvía a la lista.
 * Enseñar pasos que no existen confunde más que no enseñar ninguno.
 *
 * Cuando estén construidos, basta con pasarle `total={5}`.
 */
export function PasoWizard({
  paso,
  total = 1,
  titulo,
  descripcion,
}: {
  paso: number;
  /** Número de pasos del recorrido. Con 1, no se dibuja barra. */
  total?: number;
  titulo: string;
  descripcion?: string;
}) {
  return (
    <header className="space-y-3">
      {total > 1 && (
      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={paso}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Paso ${paso} de ${total}`}
      >
        {Array.from({ length: total }, (_, i) => {
          const n = i + 1;
          const recorrido = n <= paso;
          return (
            <span
              key={n}
              className={[
                "h-1 rounded-full transition-all",
                n === paso ? "w-8" : "w-4",
                recorrido ? "bg-primary" : "bg-border",
              ].join(" ")}
            />
          );
        })}
        <span className="rotulo ml-auto">
          {paso} / {total}
        </span>
      </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
    </header>
  );
}

/**
 * Bloque de formulario. Cada uno agrupa una idea —quién es, qué busca, qué le
 * duele— y lleva su rótulo, para que el paso se lea como una ficha y no como
 * una lista larga de campos sueltos.
 */
export function Bloque({
  rotulo,
  children,
}: {
  rotulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="rotulo">{rotulo}</h2>
      {children}
    </section>
  );
}
