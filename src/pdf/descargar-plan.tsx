"use client";

import { guardarArchivo } from "@/lib/descarga";
import { nombreArchivo, PlanPDF, type DatosPDF } from "@/pdf/plan-pdf";

/**
 * Generar el PDF de la rutina y guardarlo (tarea 6.4).
 *
 * El motor de PDF se carga con `import()` dinámico y no arriba del archivo: son
 * unos cuantos cientos de kilobytes que no pinta nada descargar en el móvil de
 * un entrenador que entra a ver la rutina y no va a exportar nada. Se traen la
 * primera vez que pulsa el botón.
 */
export async function descargarPlanPDF(datos: DatosPDF & { fechaIso: string }): Promise<void> {
  const { pdf } = await import("@react-pdf/renderer");
  const blob = await pdf(<PlanPDF {...datos} />).toBlob();
  guardarArchivo(blob, nombreArchivo(datos.atleta, datos.fechaIso));
}
