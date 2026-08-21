"use client";

import {
  analizarBorrador,
  borradorUtilizable,
  claveBorrador,
  crearBorrador,
  esClaveBorrador,
  tieneAlgoQueGuardar,
  type Borrador,
  type TipoBorrador,
} from "@/domain/borrador";

/**
 * Guardado de borradores en el dispositivo.
 *
 * Capa fina sobre localStorage: toda la lógica que se puede equivocar vive en
 * `domain/borrador.ts`, con tests. Aquí solo está lo que toca el navegador.
 *
 * localStorage y no sessionStorage a propósito: la evaluación tiene que
 * sobrevivir a que el sistema operativo cierre la app, que es exactamente lo que
 * pasa cuando el entrenador la deja en segundo plano veinte minutos
 * (CLAUDE.md §3.3).
 */

const disponible = () => typeof window !== "undefined" && Boolean(window.localStorage);

export function guardarBorrador<T extends Record<string, unknown>>(
  tipo: TipoBorrador,
  usuarioId: string,
  atletaId: string,
  datos: T,
): void {
  if (!disponible() || !atletaId) return;

  // Un formulario vacío no genera borrador: evita el aviso de "tienes algo a
  // medias" sobre una pantalla en blanco.
  if (!tieneAlgoQueGuardar(datos)) {
    descartarBorrador(tipo, atletaId);
    return;
  }

  try {
    window.localStorage.setItem(
      claveBorrador(tipo, atletaId),
      JSON.stringify(crearBorrador(usuarioId, atletaId, datos)),
    );
  } catch {
    // Cuota llena o modo privado. Perder el borrador es molesto; romper la
    // evaluación en curso es peor.
  }
}

export function leerBorrador<T>(
  tipo: TipoBorrador,
  usuarioId: string,
  atletaId: string,
): Borrador<T> | null {
  if (!disponible() || !atletaId) return null;

  const b = analizarBorrador<T>(window.localStorage.getItem(claveBorrador(tipo, atletaId)));
  if (!borradorUtilizable(b, usuarioId)) {
    // Caducado, de otro usuario o de otra versión: se limpia de paso.
    if (b) descartarBorrador(tipo, atletaId);
    return null;
  }
  return b;
}

export function descartarBorrador(tipo: TipoBorrador, atletaId: string): void {
  if (!disponible()) return;
  window.localStorage.removeItem(claveBorrador(tipo, atletaId));
}

/**
 * Borra TODOS los borradores. Se llama al cerrar sesión.
 *
 * Sin esto, en el móvil del gimnasio quedarían las evaluaciones a medias del
 * entrenador anterior, con sus pliegues y su peso, esperando a que las abra
 * cualquiera.
 */
export function limpiarBorradores(): void {
  if (!disponible()) return;
  const claves: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && esClaveBorrador(k)) claves.push(k);
  }
  for (const k of claves) window.localStorage.removeItem(k);
}
