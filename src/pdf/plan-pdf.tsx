import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  FICHA_CIERRE,
  FICHA_OBJETIVO,
  FICHA_PERIODIZACION,
  type DiaPlan,
  type EjercicioPlan,
  type Plan,
  type SemanaPlan,
} from "@/domain/plan";

/**
 * La rutina prescrita, en PDF (tareas 6.1, 6.3 y 6.4).
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ REACT-PDF, Y POR QUÉ EN EL NAVEGADOR
 * ---------------------------------------------------------------------------
 *
 * Imprimir la página no cuesta nada de montar y no sirve: no deja un ARCHIVO
 * que se pueda guardar, adjuntar o mandar por WhatsApp, que es como Giovanni
 * entrega hoy. Con react-pdf sale un `Blob` de verdad.
 *
 * Y corre en el navegador porque aquí no hay servidor donde correr: la app es
 * un exportado estático para que Capacitor la empaquete (`docs/ARQUITECTURA.md`).
 * El primer intento fue una ruta `/api/plan/pdf` y el build la rechazó, que es
 * exactamente para lo que está puesto `output: "export"`.
 *
 * La consecuencia dentro de la app nativa está prevista: quien guarda el
 * archivo es `lib/descarga.ts`, y ese es el único sitio que habrá que tocar
 * para usar el plugin de sistema de archivos en Fase B.
 *
 * ---------------------------------------------------------------------------
 * ESTA MAQUETA ES PROVISIONAL, Y ESTÁ DICHO
 * ---------------------------------------------------------------------------
 *
 * Falta su plantilla de reporte y el escudo GQ en vectorial: lo aparcó él el
 * 2-sep. El grupo 6 no se puede dar por cerrado hasta que lleguen. Lo que sí
 * está cerrado es el contenido: lo que lleva el papel y en qué orden.
 *
 * Y lleva el aviso de que el sistema es un copiloto, porque el PDF viaja fuera
 * de la app —al atleta, a otro entrenador— y ahí ya no hay interfaz que lo
 * explique.
 */

const GRIS = "#6b6b6b";
const TINTA = "#1a1a1a";
const LINEA = "#d9d9d9";

const estilos = StyleSheet.create({
  pagina: { paddingTop: 36, paddingBottom: 44, paddingHorizontal: 40, fontSize: 9.5, color: TINTA },

  titulo: { fontSize: 17, fontWeight: 700 },
  atleta: { fontSize: 11, marginTop: 2 },
  meta: { fontSize: 9, color: GRIS, marginTop: 4 },

  rotulo: {
    fontSize: 8,
    letterSpacing: 1.1,
    color: GRIS,
    textTransform: "uppercase",
    marginBottom: 6,
  },

  caja: { borderWidth: 1, borderColor: LINEA, borderRadius: 4, padding: 10, marginTop: 14 },
  linea: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },

  semana: { marginTop: 18 },
  tituloSemana: { fontSize: 12, fontWeight: 700, marginBottom: 2 },

  dia: { marginTop: 10, borderWidth: 1, borderColor: LINEA, borderRadius: 4, padding: 9 },
  tituloDia: { fontSize: 10.5, fontWeight: 700 },
  fase: { fontSize: 8.5, color: GRIS, marginTop: 2 },

  cabeceraTabla: {
    flexDirection: "row",
    marginTop: 7,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: LINEA,
  },
  fila: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: LINEA,
  },
  cEjercicio: { flex: 1, paddingRight: 6 },
  cCorta: { width: 52, textAlign: "right" },
  cabecera: { fontSize: 8, color: GRIS },
  apunte: { fontSize: 8, color: GRIS, marginTop: 1 },

  pie: {
    position: "absolute",
    bottom: 22,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: GRIS,
    borderTopWidth: 1,
    borderTopColor: LINEA,
    paddingTop: 6,
  },
});

export interface DatosPDF {
  plan: Plan;
  atleta: string;
  /** Cuándo se generó. Un plan sin fecha no se puede comparar con el siguiente. */
  fecha: string;
  /** Lo que el generador no pudo cumplir del método. Se imprime: viaja fuera. */
  avisos?: string[];
}

const ETIQUETA_SEMANA: Record<SemanaPlan["tipo"], string> = {
  carga: "Carga",
  descarga: "Descarga",
  supercompensacion: "Supercompensación",
};

const descanso = (s: number) => (s >= 60 ? `${Math.round((s / 60) * 10) / 10} min` : `${s} s`);

function Ejercicio({ e }: { e: EjercicioPlan }) {
  return (
    <View style={estilos.fila} wrap={false}>
      <View style={estilos.cEjercicio}>
        <Text>{e.ejercicio}</Text>
        {e.notas && <Text style={estilos.apunte}>{e.notas}</Text>}
        {e.sustitutos.length > 0 && (
          <Text style={estilos.apunte}>Si está ocupada: {e.sustitutos.join(" o ")}</Text>
        )}
      </View>
      <Text style={estilos.cCorta}>
        {e.seriesCalentamiento > 0 ? `${e.seriesCalentamiento} + ` : ""}
        {e.seriesEfectivas}
      </Text>
      <Text style={estilos.cCorta}>
        {e.repMin}-{e.repMax}
      </Text>
      <Text style={estilos.cCorta}>
        {e.rpePrimeras !== undefined ? `${e.rpePrimeras}/${e.rpeUltima}` : "-"}
      </Text>
      <Text style={estilos.cCorta}>{descanso(e.descansoSeg)}</Text>
    </View>
  );
}

function Dia({ dia }: { dia: DiaPlan }) {
  return (
    <View style={estilos.dia} wrap={false}>
      <Text style={estilos.tituloDia}>
        Día {dia.dia} · {dia.titulo}
      </Text>

      {/* Las tres fases van SIEMPRE, y en este orden. Es su especificación del
          1-sep: una sesión sin preparación o sin cierre no es una sesión. */}
      <Text style={estilos.fase}>
        1. Preparación · {dia.preparacion.minutos} min — {dia.preparacion.bloques.join(" · ")}
      </Text>
      <Text style={estilos.fase}>
        3. Cierre · {FICHA_CIERRE[dia.final.cierre].nombre}, {dia.final.minutos} min —{" "}
        {FICHA_CIERRE[dia.final.cierre].detalle}
      </Text>

      {dia.notas?.map((n) => (
        <Text key={n} style={estilos.fase}>
          {n}
        </Text>
      ))}

      <View style={estilos.cabeceraTabla}>
        <Text style={[estilos.cEjercicio, estilos.cabecera]}>2. Fase central</Text>
        <Text style={[estilos.cCorta, estilos.cabecera]}>Series</Text>
        <Text style={[estilos.cCorta, estilos.cabecera]}>Reps</Text>
        <Text style={[estilos.cCorta, estilos.cabecera]}>RPE</Text>
        <Text style={[estilos.cCorta, estilos.cabecera]}>Descanso</Text>
      </View>

      {dia.central.ejercicios.map((e, i) => (
        <Ejercicio key={`${e.ejercicio}-${i}`} e={e} />
      ))}
    </View>
  );
}

export function PlanPDF({ plan, atleta, fecha, avisos = [] }: DatosPDF) {
  return (
    <Document
      title={`Plan de ${atleta}`}
      author="GiosLab System"
      subject={FICHA_OBJETIVO[plan.objetivo]}
    >
      <Page size="A4" style={estilos.pagina}>
        <View>
          <Text style={estilos.titulo}>Plan de entrenamiento</Text>
          <Text style={estilos.atleta}>{atleta}</Text>
          <Text style={estilos.meta}>
            {FICHA_OBJETIVO[plan.objetivo]} · {FICHA_PERIODIZACION[plan.periodizacion].nombre} ·{" "}
            {plan.semanas.length} {plan.semanas.length === 1 ? "semana" : "semanas"} ·{" "}
            {plan.diasPorSemana} días por semana · {fecha}
          </Text>
        </View>

        {/* Lo que no cuadró con su método va en la primera página y no al final:
            quien reciba este papel tiene que leerlo antes de entrenar. */}
        {avisos.length > 0 && (
          <View style={estilos.caja}>
            <Text style={estilos.rotulo}>Lo que conviene saber</Text>
            {avisos.map((a) => (
              <Text key={a} style={estilos.apunte}>
                · {a}
              </Text>
            ))}
          </View>
        )}

        <View style={estilos.caja}>
          <Text style={estilos.rotulo}>Cómo progresa</Text>
          <View style={estilos.linea}>
            <Text>Repeticiones</Text>
            <Text>
              Subir hasta el techo del rango respetando el RPE; al tocarlo, subir carga y volver
              al piso.
            </Text>
          </View>
          <View style={estilos.linea}>
            <Text>Semanas</Text>
            <Text>
              {plan.semanas.map((s) => `S${s.semana} ${ETIQUETA_SEMANA[s.tipo].toLowerCase()}`)
                .join(" · ")}
            </Text>
          </View>
        </View>

        {plan.semanas.map((semana) => (
          <View key={semana.semana} style={estilos.semana} break={semana.semana > 1}>
            <Text style={estilos.tituloSemana}>
              Semana {semana.semana} · {ETIQUETA_SEMANA[semana.tipo]}
            </Text>
            {semana.dias.map((dia) => (
              <Dia key={dia.dia} dia={dia} />
            ))}
          </View>
        ))}

        <Text
          style={estilos.pie}
          render={({ pageNumber, totalPages }) =>
            `GiosLab System · ${atleta} · ${fecha} · página ${pageNumber} de ${totalPages}\n` +
            "Este plan lo propone el sistema a partir de la evaluación biomecánica y lo aprueba " +
            "el entrenador, que es quien prescribe."
          }
          fixed
        />
      </Page>
    </Document>
  );
}

/** Nombre del archivo: el atleta y la fecha, que es como se busca después. */
export function nombreArchivo(atleta: string, fechaIso: string): string {
  const limpio = atleta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  // La fecha entra en ISO y se corta: el nombre del archivo se ordena solo.
  return `plan-${limpio || "atleta"}-${fechaIso.slice(0, 10)}.pdf`;
}
