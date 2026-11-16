-- ===========================================================================
-- Biblioteca maestra de 125 con su jerarquía y su cadencia (4.1, 16-nov)
-- ===========================================================================
--
-- Su "matriz definitiva… ampliada a 125 ejercicios", con jerarquía J1/J2/J3,
-- perfil, cadencia por defecto y nota de prescripción para cada uno. Ahora la
-- jerarquía es SUYA en todos: "ningún ejercicio de la biblioteca debe quedar
-- sin jerarquía". Su criterio nuevo (16-nov) sustituye al del 25-sep:
--   J1 base multiarticular de alta carga / rango medio (Hack, Back Squat,
--      Hip Thrust, Press Militar, Dominadas)
--   J2 estiramiento / volumen (Prensa 45°, Búlgara, Jalones, Remos con apoyo)
--   J3 aislamiento en acortamiento (Extensión, Curl femoral, Elevaciones)
--
-- Como la vez anterior, no se borra ni se duplica nada: 96 de sus 125
-- ya existían (algunos archivados) y se renombran a su nomenclatura; 29 se
-- crean. Traducido por nosotros, para que lo revise:
--   · Perfil: de su texto ("Longitud Larga…" → estiramiento, "Longitud Corta /
--     Acortamiento…" → acortamiento, "Rango Medio…" → medio; lo demás, sin perfil).
--   · Carga axial: donde su perfil dice "Carga Axial" (no "Sin", "Cero" ni "Menor").
--   · Músculo, patrón y contraindicaciones de los nuevos: de su familia en su
--     matriz de contraindicaciones, como con los 108.
--   · Se quedan activos, con jerarquía por analogía, los 8 que sus reglas usan
--     de sustituto y su matriz no trae (Hack Libre, Low Bar, Safety Bar…).
--   · Se archivan 21 que su matriz ya no trae y ninguna regla usa.
--
-- HIPERTENSIÓN. "No los excluyas de raíz para no vaciar el día de Empuje… un
-- Ajuste de Prescripción (Modo Adaptado)": sale de las contraindicaciones de
-- todos los ejercicios, y su regla pasa a fijar 12-15 repeticiones con RIR 2-3,
-- prohibir Valsalva con su nota, y priorizar los press sentados o guiados.
--
-- Las reglas que nombraban un ejercicio renombrado pasan a una versión nueva.

-- 1. Los que ya estaban ---------------------------------------------------------

update public.exercise_library e
   set name                  = v.nombre,
       description           = coalesce(nullif(v.nota, ''), e.description),
       target_muscle         = v.musculo,
       movement_pattern      = v.patron,
       equipment             = v.equipo,
       hierarchy_level       = v.jerarquia::smallint,
       length_profile        = v.perfil,
       is_guided             = v.guiada,
       complementary_pattern = v.complementario,
       default_cadence       = v.cadencia,
       axial_load            = v.axial,
       contraindications     = v.contra::jsonb,
       is_active             = true
  from (values
    ('Sentadilla Hack (Hack Squat Machine)', 'Sentadilla Hack en Máquina', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '1', 'medio', true, null, '3010', false, 'Base multiarticular pesada. Máxima tensión y estabilidad.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Sentadilla Pendular (Pendulum Squat)', 'Sentadilla Pendular (Pendulum Squat)', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '1', null, true, null, '3010', false, 'Curva de torque avanzada. Aligera abajo y sobrecarga arriba.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Sentadilla Libre Trasera (High Bar)', 'Sentadilla Barra Trasera (Back Squat)', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '1', 'medio', false, null, '2010', true, 'Alta demanda neural y axial. Control en excéntrica.', '["Lumbar", "Cadera", "Rodilla", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Sentadilla Frontal con Barra', 'Sentadilla Frontal con Barra', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '1', 'medio', false, null, '2010', false, 'Énfasis en cuádriceps y estabilidad de torso.', '["Dorsal", "Lumbar", "Muñeca/Antebrazo", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Prensa de Piernas 45°', 'Prensa de Piernas 45°', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Volumen adaptativo. Pausa 1s en máximo estiramiento.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Sentadilla Búlgaro con Mancuernas', 'Sentadilla Búlgara con Mancuernas', 'Cuádriceps', 'squat_dominante_rodilla', 'Mancuerna', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', '3110', false, 'Estiramiento profundo. Estabilización unilateral.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Prensa Horizontal', 'Prensa Horizontal', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Pausa en estiramiento sin sobrecarga lumbar.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Sentadilla Goblet', 'Sentadilla Goblet con Mancuerna / KTB', 'Cuádriceps', 'squat_dominante_rodilla', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Trabajo de volumen y rango completo sin fatiga lumbar alta.', '["Tobillo"]'),
    ('Belt Squat (Sentadilla de Cinturón)', 'Sentadilla Belt Squat (Cinturón)', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Cero compresión espinal, alto reclutamiento de cuádriceps.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Sentadilla Zercher', 'Sentadilla Zercher con Barra', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '2', 'medio', false, null, '3010', false, 'Demanda alta de core y dominancia de cuádriceps.', '["Dorsal", "Lumbar", "Muñeca/Antebrazo", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Prensa 45° Unilateral', 'Prensa Articulada Unilateral', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Ajuste de desequilibrios y aislamiento en estiramiento.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Extensión de Rodilla en Máquina', 'Extensión de Rodilla en Máquina', 'Cuádriceps', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'extension_rodilla', '2011', false, 'Aislamiento analítico del recto femoral. Pausa 1s en contracción.', '[]'),
    ('Sentadilla Sissy (Sissy Squat Libre / Guiada)', 'Sissy Squat Guiada / Polea', 'Cuádriceps', 'isolation_accessory', 'Peso corporal', '3', 'acortamiento', false, 'extension_rodilla', '2011', false, 'Aislamiento en acortamiento/estiramiento sin carga axial.', '["Rodilla"]'),
    ('Step-Up en Banco con Mancuerna (Glúteo)', 'Step-Up / Subidas a Banco con Mancuernas', 'Glúteo', 'squat_dominante_rodilla', 'Mancuerna', '3', null, false, 'dominante_unilateral_rodilla', '2011', false, 'Enfoque en estabilización y control del paso.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Hip Thrust con Barra en Banco', 'Hip Thrust con Barra en Banco', 'Glúteo', 'hip_hinge_dominante_cadera', 'Barra', '1', 'acortamiento', false, 'puente_cadera', '2011', false, 'Base de fuerza en cadera. Pausa de 1s arriba.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Hip Thrust en Máquina Específica (Booty Builder)', 'Hip Thrust en Máquina Asistida / Panatta', 'Glúteo', 'hip_hinge_dominante_cadera', 'Máquina', '1', 'acortamiento', true, 'puente_cadera', '2011', false, 'Carga guiada con vector de fuerza optimizado en contracción.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Peso Muerto Rumano con Barra (RDL)', 'Peso Muerto Rumano con Barra (RDL)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Barra', '1', 'estiramiento', false, null, '3010', true, 'Bisagra de cadera pesada. Dominio de tensión en estiramiento.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Peso Muerto Convencional', 'Peso Muerto Tradicional', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Barra', '1', 'medio', false, null, '2010', true, 'Reclutamiento masivo. Alta demanda del SNC.', '["Lumbar", "Codo", "Muñeca/Antebrazo", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Peso Muerto Sumo', 'Peso Muerto Sumo con Barra', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Barra', '1', 'medio', false, null, '2010', false, 'Amplitud de base con alto reclutamiento de glúteo.', '["Lumbar", "Codo", "Muñeca/Antebrazo", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Peso Muerto Rumano con Mancuernas', 'Peso Muerto Rumano con Mancuernas', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Pausa 1s abajo en máximo estiramiento de isquios.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Zancadas / Lunges Caminando con Mancuernas', 'Zancadas / Lunges Caminando con Mancuernas', 'Cuádriceps', 'squat_dominante_rodilla', 'Mancuerna', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', '3110', false, 'Trabajo dinámico unilateral y control biomecánico.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Buenos Días con Barra (Good Mornings)', 'Buenos Días con Barra (Good Mornings)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Barra', '2', 'estiramiento', false, null, '3110', true, 'Bisagra de cadera con alto torque en elongación.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Curl Femoral Tumbado (Prone Leg Curl)', 'Curl Femoral Tumbado en Máquina', 'Isquiosurales', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'flexion_rodilla', '2011', false, 'Aislamiento analítico. Pausa 1s en flexión máxima.', '["Lumbar"]'),
    ('Curl Femoral Sentado (Seated Leg Curl)', 'Curl Femoral Sentado en Máquina', 'Isquiosurales', 'isolation_accessory', 'Máquina', '3', 'estiramiento', false, 'flexion_rodilla', '3110', false, 'Énfasis en estiramiento con cadera flexionada.', '["Lumbar"]'),
    ('Curl Femoral De Pie Unilateral', 'Curl Femoral De Pie Unilateral', 'Isquiosurales', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'flexion_rodilla', '2011', false, 'Trabajo analítico unilateral.', '["Lumbar"]'),
    ('Abducción de Cadera Sentado en Máquina', 'Abducción de Cadera en Máquina', 'Glúteo', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'abduccion_aduccion_cadera', '2011', false, 'Aislamiento de glúteo medio. Retención 1s en apertura.', '["Cadera"]'),
    ('Abducción en Polea De Pie / Inclinado', 'Abducción en Polea De Pie / Inclinado', 'Glúteo', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'abduccion_aduccion_cadera', '2011', false, 'Aislamiento unilateral con polea.', '["Cadera"]'),
    ('Patada de Glúteo en Polea (Cable Kickback)', 'Patada de Glúteo en Polea', 'Glúteo', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'puente_cadera', '2011', false, 'Pausa 1s en máxima extensión de cadera.', '["Cadera"]'),
    ('Hip Extension en Máquina 45°', 'Hiperextensiones en Banco a 45° (Enfoque Glúteo)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Máquina', '3', 'acortamiento', true, null, '2011', false, 'Enfoque puro en cadera redondeando zona dorsal.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Aducción de Cadera en Máquina', 'Adducción de Cadera en Máquina', 'Aductores', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'abduccion_aduccion_cadera', '2011', false, 'Trabajo analítico de la cara interna del muslo.', '["Cadera"]'),
    ('Elevación de Talones De Pie en Máquina', 'Elevación de Talones De Pie en Máquina', 'Gemelos', 'isolation_accessory', 'Máquina', '2', 'estiramiento', false, 'plantiflexion', '3110', true, 'Estiramiento completo con pausa de 1s abajo.', '["Tobillo", "Pie"]'),
    ('Elevación de Talones en Prensa de Piernas', 'Elevación de Talones en Prensa de Piernas', 'Gemelos', 'isolation_accessory', 'Máquina', '2', 'estiramiento', false, 'plantiflexion', '3110', false, 'Carga pesada sin compresión vertebral directa.', '["Tobillo", "Pie"]'),
    ('Elevación de Talones Sentado en Máquina', 'Elevación de Talones Sentado en Máquina', 'Gemelos', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'plantiflexion', '2011', false, 'Aislamiento del sóleo. Pausa arriba y abajo.', '["Tobillo", "Pie"]'),
    ('Press Inclinado con Barra (30°)', 'Press Inclinado con Barra (30°)', 'Pectoral', 'horizontal_push', 'Barra', '1', 'medio', false, null, '3010', false, 'Base multiarticular para haz clavicular.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press de Banca Plano con Barra', 'Press de Banca Plano con Barra', 'Pectoral', 'horizontal_push', 'Barra', '1', 'medio', false, null, '2010', false, 'Base multiarticular clásica de empuje horizontal.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press Declinado con Barra', 'Press Declinado con Barra', 'Pectoral', 'horizontal_push', 'Barra', '1', 'medio', false, null, '2010', false, 'Mayor ventaja mecánica y menor estrés en hombro.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press Inclinado en Máquina Smith (30°-45°)', 'Press Inclinado en Multipower / Smith', 'Pectoral', 'horizontal_push', 'Multipower', '1', 'medio', true, null, '3010', false, 'Trayectoria fija para máxima sobrecarga de haz superior.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press Convergente en Máquina (Articulado)', 'Press Convergente Horizontal en Máquina (Hammer/Panatta)', 'Pectoral', 'horizontal_push', 'Máquina', '1', 'medio', true, null, '3010', false, 'Arco natural convergente que imita mancuernas con soporte estructural.', '["Hombro", "Codo"]'),
    ('Press Inclinado en Máquina Hammer Strength', 'Press Convergente Inclinado en Máquina', 'Pectoral', 'horizontal_push', 'Máquina', '1', 'medio', true, null, '3010', false, 'Sobrecarga segura en haz superior con perfil convergente.', '["Hombro", "Codo"]'),
    ('Press Inclinado con Mancuernas (30°)', 'Press Inclinado con Mancuernas (30°)', 'Pectoral', 'horizontal_push', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Pausa 1s abajo para estiramiento pectoral.', '["Hombro", "Codo"]'),
    ('Press Plano con Mancuernas', 'Press Plano con Mancuernas', 'Pectoral', 'horizontal_push', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Estiramiento profundo en el punto bajo.', '["Hombro", "Codo"]'),
    ('Press Declinado con Mancuernas', 'Press Declinado con Mancuernas', 'Pectoral', 'horizontal_push', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Aislamiento en estiramiento con trayectoria neutra.', '["Hombro", "Codo"]'),
    ('Fondos en Paralelas para Pecho (Dips)', 'Fondos en Paralelas para Pecho (Dips)', 'Pectoral', 'horizontal_push', 'Peso corporal', '2', 'estiramiento', false, null, '3110', false, 'Torso inclinado adelante para mayor torque en pectoral.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Cruces en Polea Alta a Baja', 'Aperturas / Cruces en Polea Alta a Baja', 'Pectoral', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, null, '2011', false, 'Aislamiento con tensión constante y pausa al cruzar.', '["Hombro"]'),
    ('Aperturas / Cruces en Polea Baja a Alta', 'Aperturas en Polea Baja a Alta', 'Pectoral', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, null, '2011', false, 'Énfasis superior analítico.', '["Hombro"]'),
    ('Aperturas Inclinadas con Mancuernas (30°)', 'Aperturas con Mancuernas en Banco Inclinado', 'Pectoral', 'isolation_accessory', 'Mancuerna', '3', 'estiramiento', false, null, '3110', false, 'Tensión alta en elongación pectoral.', '["Hombro"]'),
    ('Aperturas con Mancuernas en Banco Plano', 'Aperturas con Mancuernas en Banco Plano', 'Pectoral', 'isolation_accessory', 'Mancuerna', '3', 'estiramiento', false, null, '3110', false, 'Aislamiento analítico en estiramiento.', '["Hombro"]'),
    ('Contractor / Pec Deck Machine', 'Peck Deck / Contractor de Pecho', 'Pectoral', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, null, '2011', false, 'Pausa 1s en máxima aducción horizontal.', '["Hombro"]'),
    ('Cruces en Polea Media (A nivel de pecho)', 'Cruces de Polea Horizontales (Media Altura)', 'Pectoral', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, null, '2011', false, 'Aislamiento central con retención en cruce.', '["Hombro"]'),
    ('Press Militar De Pie con Barra', 'Press Militar De Pie con Barra', 'Deltoides', 'vertical_push', 'Barra', '1', 'medio', false, null, '2010', true, 'Base multiarticular pesada. Demanda de core.', '["Cervical", "Lumbar", "Hombro", "Codo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Press Militar Sentado con Mancuernas', 'Press Militar Sentado con Mancuernas', 'Deltoides', 'vertical_push', 'Mancuerna', '1', 'medio', false, null, '3010', false, 'Empuje vertical pesado con soporte de banco.', '["Hombro", "Codo"]'),
    ('Press Militar en Máquina Guiada', 'Press Shoulder / Hombro en Máquina Guiada', 'Deltoides', 'vertical_push', 'Máquina', '2', 'medio', true, null, '3110', false, 'Volumen efectivo seguro sin sobrecarga articular.', '["Hombro", "Codo"]'),
    ('Press de Hombros Arnold (Arnold Press)', 'Press Arnold con Mancuernas', 'Deltoides', 'vertical_push', 'Mancuerna', '2', null, false, null, '3110', false, 'Mayor recorrido articular y tiempo bajo tensión.', '["Hombro", "Codo"]'),
    ('Press en Plano Escapular', 'Press en Plano Escapular (Landmine Press)', 'Deltoides', 'vertical_push', 'Mancuerna', '2', null, false, null, '3110', false, 'Trayectoria diagonal óptima para el manguito rotador.', '["Codo"]'),
    ('Elevaciones Laterales con Mancuernas', 'Elevaciones Laterales con Mancuernas', 'Deltoides', 'isolation_accessory', 'Mancuerna', '3', 'acortamiento', false, 'elevacion_hombro', '2011', false, 'Aislamiento lateral. Evitar inercia.', '["Hombro"]'),
    ('Elevaciones Laterales en Polea (Tras Espalda)', 'Elevaciones Laterales en Polea (Detrás del Cuerpo)', 'Deltoides', 'isolation_accessory', 'Polea', '3', 'estiramiento', false, 'elevacion_hombro', '2011', false, 'Perfil de resistencia optimizado en estiramiento.', '["Hombro"]'),
    ('Elevaciones Laterales en Banco Inclinado Recostado', 'Elevaciones Laterales Inclinado en Banco', 'Deltoides', 'isolation_accessory', 'Mancuerna', '3', 'estiramiento', false, 'elevacion_hombro', '2011', false, 'Pico de tensión en la fase inicial del movimiento.', '["Hombro"]'),
    ('Elevaciones Frontales con Mancuernas / Disco', 'Elevaciones Frontales con Mancuernas / Disco', 'Deltoides', 'isolation_accessory', 'Mancuerna', '3', 'acortamiento', false, null, '2011', false, 'Trabajo analítico frontal.', '["Hombro"]'),
    ('Elevaciones Laterales en Máquina Específica', 'Elevaciones Laterales en Máquina', 'Deltoides', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'elevacion_hombro', '2011', false, 'Aislamiento mecánico estricto del deltoides lateral.', '["Hombro"]'),
    ('Press de Banca con Agarre Estrecho', 'Press de Banca Agarre Cerrado', 'Pectoral', 'horizontal_push', 'Barra', '1', 'medio', false, null, '2010', false, 'Base multiarticular de fuerza para tríceps.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press Francés con Barra EZ en Banco Plano', 'Press Francés con Barra EZ en Banco Plano', 'Tríceps', 'isolation_accessory', 'Barra', '2', 'estiramiento', false, 'flexoextension_codo', '3110', false, 'Pausa 1s en estiramiento detrás de la cabeza.', '["Codo"]'),
    ('Extensiones en Polea Alta con Cuerda (Pushdown)', 'Extensión de Tríceps en Polea Alta con Cuerda', 'Tríceps', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Pausa 1s abajo abriendo la cuerda.', '["Codo"]'),
    ('Extensiones Overhead en Polea (Overhead)', 'Extensión Overhead en Polea (Sobre la Cabeza)', 'Tríceps', 'isolation_accessory', 'Polea', '3', 'estiramiento', true, 'flexoextension_codo', '2011', false, 'Énfasis en elongación de la cabeza larga.', '["Codo"]'),
    ('Extensiones en Polea Alta con Barra Recta / V', 'Extensión de Tríceps en Polea Alta con Barra Recta/V', 'Tríceps', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Aislamiento analítico con mayor agarre.', '["Codo"]'),
    ('Patada de Tríceps en Polea Baja', 'Patada de Tríceps en Polea', 'Tríceps', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Contracción analítica en extensión completa.', '["Codo"]'),
    ('Fondos en Banco', 'Fondos entre Bancos para Tríceps', 'Tríceps', 'vertical_push', 'Peso corporal', '3', 'acortamiento', false, null, '2011', false, 'Trabajo de remate analítico.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Dominadas Pronas Agarre Ancho', 'Dominadas Pronas Agarre Ancho', 'Dorsal', 'vertical_pull', 'Peso corporal', '1', 'medio', false, null, '2010', false, 'Tracción vertical base multiarticular.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hernia discal / Patología axial"]'),
    ('Remo con Barra 45° (Bent-Over Row)', 'Remo con Barra 45° (Bent-Over Row)', 'Dorsal', 'horizontal_pull', 'Barra', '1', 'medio', false, null, '2010', true, 'Remo pesado con alta demanda de la cadena posterior.', '["Lumbar", "Dorsal", "Cadera", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Remo con Barra Prono (Pendlay Row)', 'Remo Pendlay con Barra', 'Dorsal', 'horizontal_pull', 'Barra', '1', null, false, null, '2010', false, 'Tracción horizontal de máxima potencia desde paro total.', '["Lumbar", "Dorsal", "Cadera", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Remo en Máquina Lever / T-Bar con Agarre Apoyado', 'Remo en Barra T / T-Bar Row', 'Dorsal', 'horizontal_pull', 'Máquina', '1', 'medio', true, null, '2010', false, 'Gran capacidad de sobrecarga en espesor de espalda.', '["Codo"]'),
    ('Jalón al Pecho Agarre Abierto Prono', 'Jalón al Pecho Agarre Abierto Prono', 'Dorsal', 'vertical_pull', 'Polea', '2', 'estiramiento', true, null, '3110', false, 'Tracción vertical guiada. Pausa 1s arriba en estiramiento.', '["Hombro", "Codo"]'),
    ('Remo con Apoyo Pecho (Chest-Supported Row)', 'Remo con Apoyo en Pecho (Chest-Supported Row)', 'Dorsal', 'horizontal_pull', 'Máquina', '2', 'medio', true, null, '3110', false, 'Máxima fijación sin fatiga en zona lumbar.', '["Codo"]'),
    ('Remo Gironda (Polea Baja Agarre Estrecho)', 'Remo Gironda / Cable Sentado Agarre Estrecho', 'Dorsal', 'horizontal_pull', 'Polea', '2', 'estiramiento', true, null, '3110', false, 'Pausa en retracción escapular.', '["Lumbar", "Codo", "Hernia discal / Patología axial"]'),
    ('Remo con Mancuerna Unilateral (Apoyo en Banco)', 'Remo Unilateral con Mancuerna (Apoyo en Banco)', 'Dorsal', 'horizontal_pull', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Gran recorrido articular y estiramiento.', '["Codo"]'),
    ('Jalón con Agarre Supino Cerrado', 'Jalón al Pecho Agarre Neutro / Supino', 'Dorsal', 'vertical_pull', 'Polea', '2', 'medio', true, null, '3110', false, 'Mayor reclutamiento por posición de codo.', '["Hombro", "Codo"]'),
    ('Dominadas Supinas / Neutras (Pull-ups)', 'Dominadas Supinas / Neutras (Pull-Ups)', 'Dorsal', 'vertical_pull', 'Peso corporal', '2', 'medio', false, null, '2010', false, 'Tracción vertical con alta activación de flexores de codo.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hernia discal / Patología axial"]'),
    ('Jalón Neutro Uni/Bilateral en Polea', 'Jalón Unilateral en Polea Alta', 'Dorsal', 'vertical_pull', 'Polea', '2', 'estiramiento', false, null, '3110', false, 'Alineación perfecta con las fibras del dorsal.', '["Hombro", "Codo"]'),
    ('Remo Unilateral en Máquina', 'Remo en Máquina Divergente / Hammer Strength', 'Dorsal', 'horizontal_pull', 'Máquina', '2', 'medio', false, null, '3110', false, 'Aislamiento biomecánico en tracción horizontal.', '["Codo"]'),
    ('Pullover en Polea Alta con Cuerda / Barra', 'Pullover en Polea Alta con Cuerda / Barra', 'Dorsal', 'isolation_accessory', 'Polea', '3', 'estiramiento', false, null, '2011', false, 'Extensión de hombro pura sin flexión de codo.', '["Hombro", "Codo"]'),
    ('Pullover con Mancuerna en Banco Horizontal', 'Pullover con Mancuerna en Banco Transversal', 'Dorsal', 'isolation_accessory', 'Mancuerna', '3', 'estiramiento', false, null, '3110', false, 'Apertura torácica y elongación del dorsal.', '["Hombro", "Codo"]'),
    ('Face Pulls con Cuerda en Polea Alta', 'Face Pull en Polea Alta', 'Deltoides', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', '2011', false, 'Pausa 1s en rotación externa.', '["Hombro", "Cervical"]'),
    ('Pájaros con Mancuernas (Rear Delt Fly)', 'Pájaro / Pájaros con Mancuernas o Polea', 'Deltoides', 'isolation_accessory', 'Mancuerna', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', '2011', false, 'Aislamiento de deltoides posterior.', '["Dorsal", "Hombro"]'),
    ('Inverted Reverse Pec Deck (Deltoides Posterior)', 'Pájaro en Máquina Peck Deck Invertido', 'Deltoides', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', '2011', false, 'Aislamiento estricto de la cara posterior del hombro.', '["Dorsal", "Hombro"]'),
    ('Encogimientos de Hombros con Barra (Shrugs)', 'Encogimientos de Hombros con Barra / Mancuernas', 'Trapecio', 'isolation_accessory', 'Barra', '3', 'acortamiento', false, null, '2011', false, 'Eleva escapular con pausa isométrica arriba.', '["Cervical", "Hombro"]'),
    ('Curl de Bíceps con Barra EZ', 'Curl de Bíceps con Barra EZ De Pie', 'Bíceps', 'isolation_accessory', 'Barra', '2', 'medio', false, 'flexoextension_codo', '3010', false, 'Ejercicio base de flexión de codo.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Inclinado con Mancuernas (Banco 45°)', 'Curl de Bíceps en Banco Inclinado (Mancuernas)', 'Bíceps', 'isolation_accessory', 'Mancuerna', '2', 'estiramiento', false, 'flexoextension_codo', '3110', false, 'Pausa 1s abajo con hombro en extensión.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl de Bíceps con Mancuernas', 'Curl de Bíceps con Mancuernas De Pie / Alterno', 'Bíceps', 'isolation_accessory', 'Mancuerna', '2', 'medio', false, null, '3010', false, 'Flexión con supinación activa de muñeca.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Predicador / Banco Scott con Barra EZ', 'Curl Predicador / Banco Scott con Barra EZ', 'Bíceps', 'isolation_accessory', 'Barra', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Enfoque en contracción estricta.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Martillo con Mancuernas', 'Curl Martillo con Mancuernas / Polea', 'Bíceps', 'isolation_accessory', 'Mancuerna', '3', 'medio', false, 'flexoextension_codo', '2011', false, 'Énfasis en braquial anterior y antebrazo.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Concentrado con Mancuerna', 'Curl Concentrado con Mancuerna', 'Bíceps', 'isolation_accessory', 'Mancuerna', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Aislamiento analítico fijando el codo en muslo.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Araña', 'Curl Araña / Spider Curl en Banco Inclinado', 'Bíceps', 'isolation_accessory', null, '3', 'acortamiento', false, null, '2011', false, 'Pausa 1s en contracción alta sin compensación.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Crunch Abdominal en Polea De Pie / Hincado', 'Crunch Abdominal en Polea Alta', 'Core', 'core_anti_flexion_extension', 'Polea', '3', 'acortamiento', false, 'core_anti_extension_rotacion', '2011', false, 'Flexión de columna con carga controlada.', '["Cervical", "Lumbar", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Elevaciones de Piernas Colgado en Barra', 'Elevación de Piernas en Silla Romana / Colgado', 'Core', 'core_anti_flexion_extension', 'Barra', '3', 'estiramiento', false, 'core_anti_extension_rotacion', '2011', false, 'Control anti-extensión y flexión inferior.', '["Lumbar", "Hombro", "Hernia discal / Patología axial", "Diástasis abdominal", "Embarazo"]'),
    ('Plancha Isométrica (Plank)', 'Plancha Abdominal Isométrica', 'Core', 'core_anti_flexion_extension', 'Peso corporal', '3', null, false, 'core_anti_extension_rotacion', '0000', false, 'Estabilidad central estática (por tiempo).', '["Lumbar", "Hombro", "Diástasis abdominal", "Embarazo"]'),
    ('Rueda Abdominal (Ab Wheel Rollout)', 'Rueda Abdominal (Ab Wheel)', 'Core', 'core_anti_flexion_extension', 'Peso corporal', '2', 'estiramiento', false, 'core_anti_extension_rotacion', '3110', false, 'Alta demanda de control excéntrico.', '["Lumbar", "Hombro", "Hernia discal / Patología axial", "Diástasis abdominal", "Embarazo"]'),
    ('Press Pallof en Polea', 'Press Pallof en Polea / Banda', 'Core', 'core_anti_flexion_extension', 'Polea', '3', null, false, 'core_anti_extension_rotacion', '2011', false, 'Resistencia antirrotacional estricta.', '["Lumbar", "Hombro", "Diástasis abdominal", "Embarazo"]'),
    ('Hack Libre', 'Hack Libre', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '1', 'medio', false, null, '3010', false, null, '["Lumbar", "Rodilla", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Sentadilla Libre Trasera (Low Bar)', 'Sentadilla Libre Trasera (Low Bar)', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '1', 'medio', false, null, '2010', true, 'Inclinación de torso con mayor bisagra.', '["Cervical", "Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Sentadilla Heels-Elevated', 'Sentadilla Heels-Elevated', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '1', 'medio', false, null, '2010', true, null, '[]'),
    ('Sentadilla con Safety Bar', 'Sentadilla con Safety Bar', 'Cuádriceps', 'squat_dominante_rodilla', 'Safety Bar', '1', 'medio', false, null, '2010', true, null, '["Tobillo"]'),
    ('Peso Muerto Rumano desde Bloque', 'Peso Muerto Rumano desde Bloque', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Barra', '1', 'estiramiento', false, null, '3010', true, null, '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Prensa Inclinada de Piernas', 'Prensa Inclinada de Piernas', 'Cuádriceps', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', false, null, '3110', false, null, '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Press Inclinado a 60°', 'Press Inclinado a 60°', 'Pectoral', 'horizontal_push', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, null, '["Hombro", "Codo"]'),
    ('Glute Bridge con Barra / Disco', 'Glute Bridge con Barra / Disco', 'Glúteo', 'hip_hinge_dominante_cadera', 'Barra', '1', 'acortamiento', true, 'puente_cadera', '2011', false, 'Rango corto con alta carga.', '["Cadera"]')
  ) as v(viejo, nombre, musculo, patron, equipo, jerarquia, perfil, guiada, complementario, cadencia, axial, nota, contra)
 where e.name = v.viejo;

-- 2. Los nuevos -----------------------------------------------------------------

insert into public.exercise_library
  (name, target_muscle, movement_pattern, equipment, hierarchy_level, length_profile, is_guided,
   complementary_pattern, default_cadence, axial_load, description, contraindications)
select v.nombre, v.musculo, v.patron, v.equipo, v.jerarquia::smallint, v.perfil, v.guiada,
       v.complementario, v.cadencia, v.axial, v.nota, v.contra::jsonb
  from (values
    ('Sentadilla Smith / Multipower', 'Cuádriceps', 'squat_dominante_rodilla', 'Multipower', '1', 'medio', true, null, '3010', false, 'Alta estabilidad con trayectoria vertical fija.', '["Lumbar", "Cadera", "Rodilla", "Tobillo", "Hernia discal / Patología axial"]'),
    ('Zancadas / Lunges Estáticas con Barra', 'Cuádriceps', 'squat_dominante_rodilla', 'Barra', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', '3110', false, 'Carga unilateral pesada en rango amplio.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Extensión de Rodilla con Leva Variable (Nautilus/Panatta)', 'Cuádriceps', 'isolation_accessory', 'Máquina', '3', null, false, 'extension_rodilla', '2011', false, 'Tecnología de leva para mantener tensión uniforme en todo el ROM.', '[]'),
    ('Extensión de Rodilla Unilateral en Máquina', 'Cuádriceps', 'isolation_accessory', 'Máquina', '3', 'acortamiento', false, 'extension_rodilla', '2011', false, 'Enfoque analítico por pierna con retención pico.', '[]'),
    ('Spanish Squat con Banda / Polea', 'Cuádriceps', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'extension_rodilla', '2011', false, 'Aislamiento de cuádriceps con baja carga articular en rodilla.', '[]'),
    ('Hip Thrust en Máquina / Polea', 'Glúteo', 'hip_hinge_dominante_cadera', 'Máquina', '2', 'acortamiento', true, 'puente_cadera', '2011', false, 'Volumen efectivo para glúteo con tensión constante.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Peso Muerto Unilateral / B-Stance con Mancuerna', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Mancuerna', '2', 'estiramiento', false, null, '3110', false, 'Énfasis en estiramiento unilateral con apoyo de estabilidad.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Kettlebell Swing (Balanceo con KTB)', 'Glúteo', 'hip_hinge_dominante_cadera', 'Kettlebell', '2', null, false, null, '2010', false, 'Tracción explosiva de cadera en ciclo estiramiento-acortamiento.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Prensa de Piernas Invertida / Enfoque Glúteo', 'Glúteo', 'squat_dominante_rodilla', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Posicionamiento alto de pies para máximo estiramiento de glúteo.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Zancadas Reversas con Mancuernas', 'Glúteo', 'squat_dominante_rodilla', 'Mancuerna', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', '3110', false, 'Mayor torque en glúteo con menor impacto en rodilla.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Hip Thrust Unilateral con Mancuerna', 'Glúteo', 'hip_hinge_dominante_cadera', 'Mancuerna', '2', 'acortamiento', false, 'puente_cadera', '2011', false, 'Corrección de asimetrías en extensión de cadera.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Curl Femoral con Mancuerna entre los Pies', 'Isquiosurales', 'isolation_accessory', 'Mancuerna', '3', 'acortamiento', false, 'flexion_rodilla', '2011', false, 'Aislamiento analítico en banco declinado o plano.', '["Lumbar"]'),
    ('Frog Pumps (Empuje de Glúteo en Plantas)', 'Glúteo', 'isolation_accessory', 'Peso corporal', '3', 'acortamiento', false, 'puente_cadera', '2011', false, 'Agotamiento metabólico y volumen analítico.', '["Cadera"]'),
    ('Patada de Glúteo en Máquina Multipower', 'Glúteo', 'isolation_accessory', 'Multipower', '3', 'acortamiento', false, 'puente_cadera', '2011', false, 'Extensión de cadera vertical guiada.', '["Cadera"]'),
    ('Elevación de Talones Unilateral con Mancuerna', 'Gemelos', 'isolation_accessory', 'Mancuerna', '3', null, false, 'plantiflexion', '2011', false, 'Control estricto por pierna.', '["Tobillo", "Pie"]'),
    ('Press en Máquina Convergente / Chest Press', 'Pectoral', 'horizontal_push', 'Máquina', '2', 'medio', true, null, '3110', false, 'Volumen seguro con trayectoria guiada.', '["Hombro", "Codo"]'),
    ('Press Inclinado en Máquina Convergente', 'Pectoral', 'horizontal_push', 'Máquina', '2', 'estiramiento', true, null, '3110', false, 'Enfoque en estiramiento de fibras superiores.', '["Hombro", "Codo"]'),
    ('Flexiones de Pecho / Push-Ups con Lastre', 'Pectoral', 'horizontal_push', 'Peso corporal', '2', 'medio', false, null, '3010', false, 'Excelente salud escapular y control central.', '["Hombro", "Codo", "Muñeca/Antebrazo"]'),
    ('Press Neutro con Mancuernas en Banco Plano', 'Pectoral', 'horizontal_push', 'Mancuerna', '2', 'medio', false, null, '3110', false, 'Menor estrés articular en manguito rotador.', '["Hombro", "Codo"]'),
    ('Press Militar Sentado con Barra', 'Deltoides', 'vertical_push', 'Barra', '1', 'medio', false, null, '2010', false, 'Base de empuje vertical estricta.', '["Hombro", "Codo"]'),
    ('Press Shoulder Convergente en Máquina (Hammer/Panatta)', 'Deltoides', 'vertical_push', 'Máquina', '1', 'medio', true, null, '3010', false, 'Empuje vertical guiado con apertura ergonómica natural.', '["Hombro", "Codo"]'),
    ('Elevaciones Frontales en Polea con Cuerda', 'Deltoides', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, null, '2011', false, 'Aislamiento continuo en elevación anterior.', '["Hombro"]'),
    ('Extensión de Tríceps Unilateral en Polea (Catéter)', 'Tríceps', 'isolation_accessory', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', '2011', false, 'Aislamiento estricto por brazo.', '["Codo"]'),
    ('Remo Convergente Horizontal en Máquina (Hammer/Panatta)', 'Dorsal', 'horizontal_pull', 'Máquina', '1', 'medio', true, null, '3010', false, 'Remo horizontal guiado con arco biomecánico natural.', '["Codo"]'),
    ('Remo al Mentón con Barra / Polea', 'Trapecio', 'isolation_accessory', 'Barra', '3', 'medio', false, 'elevacion_hombro', '2011', false, 'Énfasis en fibras superiores y lateral de hombro.', '["Cervical", "Hombro"]'),
    ('Curl de Bíceps en Polea Baja con Barra / Cuerda', 'Bíceps', 'isolation_accessory', 'Polea', '3', null, false, 'flexoextension_codo', '2011', false, 'Tensión uniforme durante todo el ROM.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Crunch en Banco Declinado', 'Core', 'core_anti_flexion_extension', 'Peso corporal', '3', 'acortamiento', false, 'core_anti_extension_rotacion', '2011', false, 'Flexión del tronco contra gravedad.', '["Cervical", "Lumbar", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Oblicuos en Polea / Hiperextensión Lateral', 'Core', 'core_anti_flexion_extension', 'Polea', '3', null, false, 'core_anti_extension_rotacion', '2011', false, 'Aislamiento analítico de pared lateral.', '["Cervical", "Lumbar", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Vacuum Abdominal / Vacío Abdominal', 'Core', 'core_anti_flexion_extension', 'Peso corporal', '3', null, false, 'core_anti_extension_rotacion', '0000', false, 'Activación de la musculatura profunda del core.', '["Lumbar", "Hombro", "Diástasis abdominal", "Embarazo"]')
  ) as v(nombre, musculo, patron, equipo, jerarquia, perfil, guiada, complementario, cadencia, axial, nota, contra);

-- 3. Lo que su matriz ya no trae y ninguna regla usa ----------------------------

update public.exercise_library
   set is_active = false
 where name in ('Copas con Mancuerna a dos Manos', 'Copenhague Plank (Adductor Plank)', 'Crunch Abdominal en Máquina Específica', 'Curl de Bíceps de Espaldas a la Polea (Bayesian)', 'Curl de Muñeca Prono con Barra (Antebrazo Inverso)', 'Curl de Muñeca Supino con Barra (Antebrazo)', 'Curl Martillo en Polea Baja con Cuerda', 'Encogimientos con Mancuernas', 'Fondos en Paralelas (énfasis tríceps)', 'Jalón al Pecho Agarre V (Estrecho)', 'Nordic Hamstring Curl (Curl Nórdico)', 'Peso Muerto Piernas Rígidas (Stiff-Leg)', 'Press Cerrado en Banco Plano', 'Press Plano en Máquina Smith / Multipower', 'Press Svend con Disco / Mancuerna', 'Pullover con Mancuerna en Banco', 'Remo Gironda Agarre Ancho Prono', 'Remo Meadows con Barra T (Unilateral)', 'Remo Seal Row (Banco Elevado)', 'Sentadilla Bulgara', 'Sentadilla Goblet con Talones Elevados');

-- 4. La hipertensión deja de excluir (también en los archivados) -------------------

update public.exercise_library
   set contraindications = contraindications - 'Hipertensión / Cardiovascular'
 where contraindications ? 'Hipertensión / Cardiovascular';

-- 5. Las reglas -------------------------------------------------------------------

update public.rules
   set is_active = false
 where is_active
   and rule_key in ('dominancia-cadera', 'dorsiflexion-severa', 'embarazo-post-primer-trimestre', 'flexion-hombro-restringida', 'hipertension-valsalva', 'rotacion-externa-hombro-limitada', 'slr-isquiotibiales-restringido', 'vector-espalda-densidad', 'vector-gluteo-anteroposterior', 'vector-gluteo-vertical-lateral');

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select r.rule_key,
       r.version + 1,
       r.nivel,
       r.condition,
       n.acciones::jsonb,
       coalesce(n.justificacion, r.justification),
       r.evidence_level,
       true
  from public.rules r
  join (values
    ('dominancia-cadera', '{"priorizar": ["Hack Libre", "Sissy Squat Guiada / Polea", "Extensión de Rodilla en Máquina"], "ratio_patron": {"hip_hinge_dominante_cadera": 0.4, "squat_dominante_rodilla": 0.6}}', null),
    ('dorsiflexion-severa', '{"excluir_ejercicios": ["Sentadilla Barra Trasera (Back Squat)", "Hack Libre"], "sustituir_por": ["Sentadilla Heels-Elevated", "Prensa de Piernas 45°", "Sentadilla Búlgara con Mancuernas"]}', null),
    ('embarazo-post-primer-trimestre', '{"excluir_ejercicios": ["Sentadilla Barra Trasera (Back Squat)", "Sentadilla Libre Trasera (Low Bar)", "Peso Muerto Tradicional", "Glute Bridge con Barra / Disco"], "modificador": "Priorizar posiciones sentadas o inclinadas y apoyo unilateral controlado; evitar decúbito prono, cargas axiales y riesgo de impacto", "sustituir_por": ["Prensa de Piernas 45°", "Sentadilla Búlgara con Mancuernas"]}', null),
    ('flexion-hombro-restringida', '{"excluir_ejercicios": ["Press Militar tras Nuca", "Press Militar De Pie con Barra"], "sustituir_por": ["Press Inclinado a 60°", "Press en Plano Escapular (Landmine Press)"]}', null),
    ('hipertension-valsalva', '{"prohibir_maniobra": ["Valsalva"], "rir": {"piso": 2}, "rango_repeticiones": {"min": 12, "max": 15}, "priorizar": ["Press Convergente Horizontal en Máquina (Hammer/Panatta)", "Press en Máquina Convergente / Chest Press", "Press Militar Sentado con Mancuernas", "Press Shoulder / Hombro en Máquina Guiada", "Press Inclinado en Multipower / Smith"], "modificador": "Ejecutar con respiración continua en fase excéntrica y concéntrica. Prohibida la maniobra de Valsalva (bloqueo respiratorio). Nunca al fallo (RIR 2-3)."}', 'Hipertensión o riesgo cardiovascular: no se excluyen los press, se adapta la prescripción (16-nov). 12-15 repeticiones con RIR 2-3 sin llegar nunca al fallo, respiración continua sin Valsalva, y variantes sentadas o guiadas antes que los press libres pesados de pie para evitar picos de presión intraabdominal.'),
    ('rotacion-externa-hombro-limitada', '{"excluir_ejercicios": ["Sentadilla Libre Trasera (Low Bar)"], "sustituir_por": ["Sentadilla Goblet con Mancuerna / KTB", "Sentadilla con Safety Bar", "Sentadilla Frontal con Barra"]}', null),
    ('slr-isquiotibiales-restringido', '{"excluir_ejercicios": ["Peso Muerto Tradicional"], "sustituir_por": ["Peso Muerto Rumano desde Bloque"]}', null),
    ('vector-espalda-densidad', '{"priorizar": ["Remo con Barra 45° (Bent-Over Row)", "Remo Gironda / Cable Sentado Agarre Estrecho", "Remo Unilateral con Mancuerna (Apoyo en Banco)"]}', null),
    ('vector-gluteo-anteroposterior', '{"priorizar": ["Hip Thrust con Barra en Banco", "Glute Bridge con Barra / Disco", "Patada de Glúteo en Polea"]}', null),
    ('vector-gluteo-vertical-lateral', '{"priorizar": ["Sentadilla Búlgara con Mancuernas", "Zancadas / Lunges Caminando con Mancuernas", "Abducción en Polea De Pie / Inclinado"]}', null)
  ) as n(rule_key, acciones, justificacion) on n.rule_key = r.rule_key
 where r.version = (select max(x.version) from public.rules x where x.rule_key = r.rule_key);

-- 6. Comprobación ---------------------------------------------------------------

do $$
declare
  faltan text;
  huerfanos text;
begin
  select string_agg(n, ', ') into faltan
    from unnest(array['Sentadilla Hack en Máquina', 'Sentadilla Pendular (Pendulum Squat)', 'Sentadilla Barra Trasera (Back Squat)', 'Sentadilla Frontal con Barra', 'Sentadilla Smith / Multipower', 'Prensa de Piernas 45°', 'Sentadilla Búlgara con Mancuernas', 'Prensa Horizontal', 'Sentadilla Goblet con Mancuerna / KTB', 'Sentadilla Belt Squat (Cinturón)', 'Sentadilla Zercher con Barra', 'Zancadas / Lunges Estáticas con Barra', 'Prensa Articulada Unilateral', 'Extensión de Rodilla en Máquina', 'Extensión de Rodilla con Leva Variable (Nautilus/Panatta)', 'Sissy Squat Guiada / Polea', 'Extensión de Rodilla Unilateral en Máquina', 'Step-Up / Subidas a Banco con Mancuernas', 'Spanish Squat con Banda / Polea', 'Hip Thrust con Barra en Banco', 'Hip Thrust en Máquina Asistida / Panatta', 'Peso Muerto Rumano con Barra (RDL)', 'Peso Muerto Tradicional', 'Peso Muerto Sumo con Barra', 'Peso Muerto Rumano con Mancuernas', 'Zancadas / Lunges Caminando con Mancuernas', 'Hip Thrust en Máquina / Polea', 'Peso Muerto Unilateral / B-Stance con Mancuerna', 'Buenos Días con Barra (Good Mornings)', 'Kettlebell Swing (Balanceo con KTB)', 'Prensa de Piernas Invertida / Enfoque Glúteo', 'Zancadas Reversas con Mancuernas', 'Hip Thrust Unilateral con Mancuerna', 'Curl Femoral Tumbado en Máquina', 'Curl Femoral Sentado en Máquina', 'Curl Femoral De Pie Unilateral', 'Curl Femoral con Mancuerna entre los Pies', 'Abducción de Cadera en Máquina', 'Abducción en Polea De Pie / Inclinado', 'Patada de Glúteo en Polea', 'Frog Pumps (Empuje de Glúteo en Plantas)', 'Hiperextensiones en Banco a 45° (Enfoque Glúteo)', 'Patada de Glúteo en Máquina Multipower', 'Adducción de Cadera en Máquina', 'Elevación de Talones De Pie en Máquina', 'Elevación de Talones en Prensa de Piernas', 'Elevación de Talones Sentado en Máquina', 'Elevación de Talones Unilateral con Mancuerna', 'Press Inclinado con Barra (30°)', 'Press de Banca Plano con Barra', 'Press Declinado con Barra', 'Press Inclinado en Multipower / Smith', 'Press Convergente Horizontal en Máquina (Hammer/Panatta)', 'Press Convergente Inclinado en Máquina', 'Press Inclinado con Mancuernas (30°)', 'Press Plano con Mancuernas', 'Press Declinado con Mancuernas', 'Press en Máquina Convergente / Chest Press', 'Press Inclinado en Máquina Convergente', 'Fondos en Paralelas para Pecho (Dips)', 'Flexiones de Pecho / Push-Ups con Lastre', 'Press Neutro con Mancuernas en Banco Plano', 'Aperturas / Cruces en Polea Alta a Baja', 'Aperturas en Polea Baja a Alta', 'Aperturas con Mancuernas en Banco Inclinado', 'Aperturas con Mancuernas en Banco Plano', 'Peck Deck / Contractor de Pecho', 'Cruces de Polea Horizontales (Media Altura)', 'Press Militar De Pie con Barra', 'Press Militar Sentado con Mancuernas', 'Press Militar Sentado con Barra', 'Press Shoulder Convergente en Máquina (Hammer/Panatta)', 'Press Shoulder / Hombro en Máquina Guiada', 'Press Arnold con Mancuernas', 'Press en Plano Escapular (Landmine Press)', 'Elevaciones Laterales con Mancuernas', 'Elevaciones Laterales en Polea (Detrás del Cuerpo)', 'Elevaciones Laterales Inclinado en Banco', 'Elevaciones Frontales con Mancuernas / Disco', 'Elevaciones Frontales en Polea con Cuerda', 'Elevaciones Laterales en Máquina', 'Press de Banca Agarre Cerrado', 'Press Francés con Barra EZ en Banco Plano', 'Extensión de Tríceps en Polea Alta con Cuerda', 'Extensión Overhead en Polea (Sobre la Cabeza)', 'Extensión de Tríceps en Polea Alta con Barra Recta/V', 'Patada de Tríceps en Polea', 'Extensión de Tríceps Unilateral en Polea (Catéter)', 'Fondos entre Bancos para Tríceps', 'Dominadas Pronas Agarre Ancho', 'Remo con Barra 45° (Bent-Over Row)', 'Remo Pendlay con Barra', 'Remo en Barra T / T-Bar Row', 'Remo Convergente Horizontal en Máquina (Hammer/Panatta)', 'Jalón al Pecho Agarre Abierto Prono', 'Remo con Apoyo en Pecho (Chest-Supported Row)', 'Remo Gironda / Cable Sentado Agarre Estrecho', 'Remo Unilateral con Mancuerna (Apoyo en Banco)', 'Jalón al Pecho Agarre Neutro / Supino', 'Dominadas Supinas / Neutras (Pull-Ups)', 'Jalón Unilateral en Polea Alta', 'Remo en Máquina Divergente / Hammer Strength', 'Pullover en Polea Alta con Cuerda / Barra', 'Pullover con Mancuerna en Banco Transversal', 'Face Pull en Polea Alta', 'Pájaro / Pájaros con Mancuernas o Polea', 'Pájaro en Máquina Peck Deck Invertido', 'Encogimientos de Hombros con Barra / Mancuernas', 'Remo al Mentón con Barra / Polea', 'Curl de Bíceps con Barra EZ De Pie', 'Curl de Bíceps en Banco Inclinado (Mancuernas)', 'Curl de Bíceps con Mancuernas De Pie / Alterno', 'Curl Predicador / Banco Scott con Barra EZ', 'Curl Martillo con Mancuernas / Polea', 'Curl de Bíceps en Polea Baja con Barra / Cuerda', 'Curl Concentrado con Mancuerna', 'Curl Araña / Spider Curl en Banco Inclinado', 'Crunch Abdominal en Polea Alta', 'Elevación de Piernas en Silla Romana / Colgado', 'Plancha Abdominal Isométrica', 'Rueda Abdominal (Ab Wheel)', 'Press Pallof en Polea / Banda', 'Crunch en Banco Declinado', 'Oblicuos en Polea / Hiperextensión Lateral', 'Vacuum Abdominal / Vacío Abdominal', 'Hack Libre', 'Sentadilla Libre Trasera (Low Bar)', 'Sentadilla Heels-Elevated', 'Sentadilla con Safety Bar', 'Peso Muerto Rumano desde Bloque', 'Prensa Inclinada de Piernas', 'Press Inclinado a 60°', 'Glute Bridge con Barra / Disco']) as n
   where not exists (select 1 from public.exercise_library e
                      where e.name = n and e.is_active and e.hierarchy_level is not null
                        and e.default_cadence is not null);
  if faltan is not null then
    raise exception 'Faltan, están archivados o sin jerarquía/cadencia: %', faltan;
  end if;

  if exists (select 1 from public.exercise_library where is_active and hierarchy_level is null) then
    raise exception 'Queda un ejercicio activo sin jerarquía.';
  end if;

  -- Lo que una regla PRIORIZA o propone de SUSTITUTO tiene que estar activo.
  select string_agg(distinct r.rule_key || ' → ' || n, ', ') into huerfanos
    from public.rules r,
         jsonb_array_elements_text(
           coalesce(r.actions -> 'priorizar', '[]') || coalesce(r.actions -> 'sustituir_por', '[]')) as n
   where r.is_active
     and not exists (select 1 from public.exercise_library e where e.name = n and e.is_active);
  if huerfanos is not null then
    raise exception 'Reglas que proponen ejercicios que no están: %', huerfanos;
  end if;
end $$;
