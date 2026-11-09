-- ===========================================================================
-- Biblioteca maestra de 108 ejercicios (4.1, 9-nov)
-- ===========================================================================
--
-- Giovanni: "el software sigue topado en 52 ejercicios prescribibles. Ya está
-- estructurada la base de datos maestra con los 108 ejercicios maestros y su
-- nomenclatura exacta… hay que importarla para liberar el motor". Su Excel
-- "11_Master_108_Completa_GiosLab_v3".
--
-- NO SE BORRA NI SE DUPLICA NADA. 68 de sus 108 ya estaban en la
-- biblioteca con otro nombre (activos o archivados): se renombran a su
-- nomenclatura y se actualizan, así conservan sus contraindicaciones, sus
-- relaciones y su historial. Los 40 restantes se crean. Los activos que
-- su Excel no trae (Hack Libre, Press en Plano Escapular, Press Militar tras
-- Nuca, Safety Bar, Rumano desde Bloque…) siguen activos: sus reglas de
-- movilidad los usan de sustitutos.
--
-- De su Excel, tal cual: nombre, perfil de longitud (sus tres textos de la
-- interfaz), equipamiento, nota biomecánica (solo donde no había descripción)
-- y su "Clasificación Estructural" en el tipo biomecánico. Traducido por
-- nosotros, para que lo revise:
--   · Músculo: su grupo con el vocabulario del método (Pecho → Pectoral,
--     Espalda → Dorsal salvo el trapecio superior, Abdomen → Core…). Aductores
--     y Antebrazo son nuevos y el método v6 ya los conoce.
--   · Patrón básico: lo monoarticular a aislamiento, lo de abdomen a core, y lo
--     multiarticular por su patrón principal.
--   · Patrón complementario: su matriz complementaria.
--   · Guiada: "Multiarticular Guiado" de su clasificación.
--   · Jerarquía: la que ya tenía cada ejercicio (su tabla del 25-sep) se
--     respeta. A los demás solo se les pone la que su definición deja sin
--     duda —aislamiento con el músculo acortado es J3— y el resto queda sin
--     clasificar, como el 25-sep: se prescribe, pero detrás de lo que él
--     ordenó. Derivar un J1 lo pondría a competir con los suyos.
--   · Contraindicaciones: las que ya tenía se quedan. A los nuevos y a los
--     archivados que vuelven sin ninguna se les copian las de su familia en su
--     Matriz de Contraindicaciones (Press Declinado = Press de Banca, Rumano
--     con Mancuernas = Rumano…). Sin contraindicaciones el motor se lo daría a
--     un atleta con una lesión que su matriz excluye.
--
-- Las 11 reglas que nombraban un ejercicio renombrado pasan a una versión
-- nueva con el nombre nuevo: el motor cruza por nombre y una regla que nombra
-- algo que ya no existe no falla, simplemente deja de actuar.

-- 1. Los que ya estaban ---------------------------------------------------------

update public.exercise_library e
   set name                  = v.nombre,
       description           = coalesce(e.description, v.nota),
       target_muscle         = v.musculo,
       movement_pattern      = v.patron,
       biomechanical_type    = v.tipo,
       equipment             = v.equipo,
       hierarchy_level       = v.jerarquia::smallint,
       length_profile        = v.perfil,
       is_guided             = v.guiada,
       complementary_pattern = v.complementario,
       contraindications     = coalesce(v.contra::jsonb, e.contraindications),
       is_active             = true
  from (values
    ('Press de Banca Plano (Bench Press)', 'Press de Banca Plano con Barra', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Barra', '2', 'medio', false, null, 'Sobrecarga axial esternal y empuje libre.', null),
    ('Press Inclinado con Mancuernas', 'Press Inclinado con Mancuernas (30°)', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Mancuerna', '1', 'estiramiento', false, null, 'Vector inclinado óptimo para fibras claviculares.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Press Plano en Máquina Articulada', 'Press Convergente en Máquina (Articulado)', 'Pectoral', 'horizontal_push', 'Multiarticular Guiado', 'Máquina', '2', 'acortamiento', true, null, 'Aducción con máxima estabilidad.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Press Inclinado en Máquina Articulada', 'Press Inclinado en Máquina Hammer Strength', 'Pectoral', 'horizontal_push', 'Multiarticular Guiado', 'Máquina', '1', 'estiramiento', true, null, 'Aislamiento pesado seguro.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Press Plano en Multipower', 'Press Plano en Máquina Smith / Multipower', 'Pectoral', 'horizontal_push', 'Multiarticular Guiado', 'Multipower', '2', 'estiramiento', true, null, 'Fallo mecánico guiado con máxima estabilidad.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Press Inclinado en Multipower', 'Press Inclinado en Máquina Smith (30°-45°)', 'Pectoral', 'horizontal_push', 'Multiarticular Guiado', 'Multipower', '1', 'estiramiento', true, null, 'Pausa en máximo estiramiento clavicular.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Press Inclinado con Barra', 'Press Inclinado con Barra (30°)', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Barra', '1', 'estiramiento', false, null, 'Fuerza básica para porción alta.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Aperturas / Cruce de Poleas', 'Cruces en Polea Media (A nivel de pecho)', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Polea', '3', 'acortamiento', false, null, 'Tensión continua en plano transversal.', null),
    ('Pec Deck', 'Contractor / Pec Deck Machine', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Máquina', '3', 'acortamiento', false, null, 'Estabilidad extrema para reclutamiento.', '["Hombro"]'),
    ('Fondos en Paralelas (énfasis pectoral)', 'Fondos en Paralelas para Pecho (Dips)', 'Pectoral', 'horizontal_push', 'Multiarticular Peso Corp.', 'Peso corporal', null, 'estiramiento', false, null, 'Gran sobrecarga en elongación.', null),
    ('Jalón al Pecho en Polea', 'Jalón al Pecho Agarre Abierto Prono', 'Dorsal', 'vertical_pull', 'Multiarticular Guiado', 'Polea', '1', 'estiramiento', true, null, 'Anchura de dorsal sin tracción tras nuca.', null),
    ('Dominadas', 'Dominadas Pronas Agarre Ancho', 'Dorsal', 'vertical_pull', 'Multiarticular Peso Corp.', 'Peso corporal', '1', 'estiramiento', false, null, 'Densidad y anchura superior.', null),
    ('Remo Pendlay', 'Remo con Barra Prono (Pendlay Row)', 'Dorsal', 'horizontal_pull', 'Multiarticular Libre', 'Barra', null, 'medio', false, null, 'Tracción desde el suelo a 90°.', '["Lumbar", "Dorsal", "Cadera", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Remo con Barra', 'Remo con Barra 45° (Bent-Over Row)', 'Dorsal', 'horizontal_pull', 'Multiarticular Libre', 'Barra', '2', 'estiramiento', false, null, 'Sobrecarga pesada clásica.', null),
    ('Remo Unilateral con Mancuerna', 'Remo con Mancuerna Unilateral (Apoyo en Banco)', 'Dorsal', 'horizontal_pull', 'Multiarticular Unilateral', 'Mancuerna', '2', 'estiramiento', false, null, 'Arco de movimiento codo a cadera.', null),
    ('Remo Girona', 'Remo Gironda (Polea Baja Agarre Estrecho)', 'Dorsal', 'horizontal_pull', 'Multiarticular Guiado', 'Polea', '2', 'acortamiento', true, null, 'Retracción escapular completa.', null),
    ('Remo con Pecho Apoyado', 'Remo con Apoyo Pecho (Chest-Supported Row)', 'Dorsal', 'horizontal_pull', 'Multiarticular Guiado', 'Máquina', '2', 'acortamiento', true, null, 'Aislamiento sin fatiga lumbar.', '["Codo"]'),
    ('Pullover con Cuerda', 'Pullover en Polea Alta con Cuerda / Barra', 'Dorsal', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Polea', '3', 'estiramiento', false, null, 'Aislamiento puro de dorsal.', null),
    ('Encogimientos de Hombros (Shrugs)', 'Encogimientos de Hombros con Barra (Shrugs)', 'Trapecio', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Barra', '3', 'acortamiento', false, null, 'Sobrecarga directa de trapecio.', null),
    ('Sentadilla Libre Profunda', 'Sentadilla Libre Trasera (High Bar)', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Libre', 'Barra', '1', 'estiramiento', false, null, 'Profundidad máxima con carga axial.', null),
    ('Sentadilla Low Bar', 'Sentadilla Libre Trasera (Low Bar)', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Libre', 'Barra', null, 'estiramiento', false, null, 'Inclinación de torso con mayor bisagra.', null),
    ('Sentadilla Frontal', 'Sentadilla Frontal con Barra', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Libre', 'Barra', null, 'estiramiento', false, null, 'Torso erguido y momento en rodilla.', null),
    ('Sentadilla Hack en Máquina', 'Sentadilla Hack (Hack Squat Machine)', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Guiado', 'Máquina', '1', 'estiramiento', true, null, 'Alta estabilidad para fallo mecánico.', '["Lumbar", "Cadera", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'),
    ('Sissy Squat', 'Sentadilla Sissy (Sissy Squat Libre / Guiada)', 'Cuádriceps', 'isolation_accessory', 'Extensión de Rodilla Monoarticular', 'Peso corporal', null, 'estiramiento', false, 'extension_rodilla', 'Aísla recto femoral en elongación.', null),
    ('Prensa 45°', 'Prensa de Piernas 45°', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Guiado', 'Máquina', '1', 'estiramiento', true, null, 'Gran capacidad de carga guiada.', null),
    ('Extensiones de Cuádriceps', 'Extensión de Rodilla en Máquina', 'Cuádriceps', 'isolation_accessory', 'Extensión de Rodilla Monoarticular', 'Máquina', '3', 'acortamiento', false, 'extension_rodilla', 'Aísla extensión sin flexión de cadera.', '[]'),
    ('Sentadilla Búlgara con Apoyo', 'Sentadilla Búlgaro con Mancuernas', 'Cuádriceps', 'squat_dominante_rodilla', 'Dominante Unilateral de Rodilla', 'Mancuerna', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', 'Corrige asimetrías y demanda estabilidad.', null),
    ('Zancadas Caminando', 'Zancadas / Lunges Caminando con Mancuernas', 'Cuádriceps', 'squat_dominante_rodilla', 'Dominante Unilateral de Rodilla', 'Mancuerna', '2', 'estiramiento', false, 'dominante_unilateral_rodilla', 'Componente dinámico y volumen.', null),
    ('Peso Muerto Rumano', 'Peso Muerto Rumano con Barra (RDL)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Barra', '1', 'estiramiento', false, null, 'Tensión en estiramiento de isquios.', null),
    ('Curl Femoral Acostado', 'Curl Femoral Tumbado (Prone Leg Curl)', 'Isquiosurales', 'isolation_accessory', 'Flexión de Rodilla Monoarticular', 'Máquina', '3', 'acortamiento', false, 'flexion_rodilla', 'Aislamiento de la función flexora.', null),
    ('Curl Femoral Sentado', 'Curl Femoral Sentado (Seated Leg Curl)', 'Isquiosurales', 'isolation_accessory', 'Flexión de Rodilla Monoarticular', 'Máquina', '2', 'estiramiento', false, 'flexion_rodilla', 'Estiramiento en origen isquiático.', '["Lumbar"]'),
    ('Curl Femoral de Pie', 'Curl Femoral De Pie Unilateral', 'Isquiosurales', 'isolation_accessory', 'Flexión de Rodilla Monoarticular', 'Polea', '3', 'acortamiento', false, 'flexion_rodilla', 'Aislamiento unilateral estricto.', '["Lumbar"]'),
    ('Peso Muerto Convencional', 'Peso Muerto Convencional', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Barra', null, 'medio', false, null, 'Fuerza y tensión sistémica.', null),
    ('Peso Muerto Sumo', 'Peso Muerto Sumo', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Barra', '2', 'estiramiento', false, null, 'Menor palanca lumbar, más cadera.', '["Lumbar", "Codo", "Muñeca/Antebrazo", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular", "Diástasis abdominal"]'),
    ('Buenos Días', 'Buenos Días con Barra (Good Mornings)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Barra', '1', 'estiramiento', false, null, 'Estiramiento bajo carga en cadena posterior.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Curl Nordico', 'Nordic Hamstring Curl (Curl Nórdico)', 'Isquiosurales', 'isolation_accessory', 'Excéntrico Puro', 'Peso corporal', '2', 'estiramiento', false, 'flexion_rodilla', 'Sobrecarga excéntrica de alta intensidad.', null),
    ('Hip Thrust con Barra', 'Hip Thrust con Barra en Banco', 'Glúteo', 'hip_hinge_dominante_cadera', 'Extensión / Puente de Cadera', 'Barra', '1', 'acortamiento', false, 'puente_cadera', 'Máxima tensión en acortamiento.', null),
    ('Glute Bridge', 'Glute Bridge con Barra / Disco', 'Glúteo', 'hip_hinge_dominante_cadera', 'Extensión / Puente de Cadera', 'Barra', '2', 'acortamiento', true, 'puente_cadera', 'Rango corto con alta carga.', null),
    ('Hip Thrust en Máquina', 'Hip Thrust en Máquina Específica (Booty Builder)', 'Glúteo', 'hip_hinge_dominante_cadera', 'Extensión / Puente de Cadera', 'Máquina', '1', 'acortamiento', true, 'puente_cadera', 'Tensión constante con cinturón.', '["Lumbar", "Cadera", "Hernia discal / Patología axial"]'),
    ('Patada de Glúteo en Polea', 'Patada de Glúteo en Polea (Cable Kickback)', 'Glúteo', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Polea', '3', 'acortamiento', false, 'puente_cadera', 'Alineación directa con fibras de glúteo.', null),
    ('Abducción en Máquina', 'Abducción de Cadera Sentado en Máquina', 'Glúteo', 'isolation_accessory', 'Abducción / Aducción de Cadera', 'Máquina', '3', 'acortamiento', false, 'abduccion_aduccion_cadera', 'Aislamiento de glúteo medio.', '["Cadera"]'),
    ('Abducciones en Polea', 'Abducción en Polea De Pie / Inclinado', 'Glúteo', 'isolation_accessory', 'Abducción / Aducción de Cadera', 'Polea', '3', 'estiramiento', false, 'abduccion_aduccion_cadera', 'Tensión continua en plano frontal.', null),
    ('Step hup', 'Step-Up en Banco con Mancuerna (Glúteo)', 'Glúteo', 'squat_dominante_rodilla', 'Dominante Unilateral de Rodilla', 'Mancuerna', null, 'estiramiento', false, 'dominante_unilateral_rodilla', 'Brazo de palanca con torso inclinado.', '["Cadera", "Tobillo", "Embarazo"]'),
    ('Press Overhead con Barra', 'Press Militar De Pie con Barra', 'Deltoides', 'vertical_push', 'Multiarticular Libre', 'Barra', '1', 'estiramiento', false, null, 'Básico de fuerza overhead.', null),
    ('Press Militar con Mancuernas', 'Press Militar Sentado con Mancuernas', 'Deltoides', 'vertical_push', 'Multiarticular Libre', 'Mancuerna', '1', 'estiramiento', false, null, 'Convergencia natural superior.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Press Arnold', 'Press de Hombros Arnold (Arnold Press)', 'Deltoides', 'vertical_push', 'Multiarticular Libre', 'Mancuerna', null, 'medio', false, null, 'Rotación con amplio recorrido.', null),
    ('Press Militar en Máquina con Respaldo', 'Press Militar en Máquina Guiada', 'Deltoides', 'vertical_push', 'Multiarticular Guiado', 'Máquina', '1', 'estiramiento', true, null, 'Fallo seguro en deltoides.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Elevaciones Laterales', 'Elevaciones Laterales con Mancuernas', 'Deltoides', 'isolation_accessory', 'Abducción / Elevación de Hombro', 'Mancuerna', '2', 'acortamiento', false, 'elevacion_hombro', 'Gravedad máxima a 90° de abducción.', null),
    ('Elevación Lateral en Polea', 'Elevaciones Laterales en Polea (Tras Espalda)', 'Deltoides', 'isolation_accessory', 'Abducción / Elevación de Hombro', 'Polea', '2', 'estiramiento', false, 'elevacion_hombro', 'Tensión constante desde 0°.', '["Hombro"]'),
    ('Pájaro / Rear Delt Fly', 'Pájaros con Mancuernas (Rear Delt Fly)', 'Deltoides', 'isolation_accessory', 'Abducción Horizontal / Rotación', 'Mancuerna', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', 'Deltoides posterior inclinado.', null),
    ('Face Pull', 'Face Pulls con Cuerda en Polea Alta', 'Deltoides', 'isolation_accessory', 'Salud Articular / Manguito', 'Polea', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', 'Manguito rotador y salud posterior.', null),
    ('Rear Delt en Pec Deck', 'Inverted Reverse Pec Deck (Deltoides Posterior)', 'Deltoides', 'isolation_accessory', 'Abducción Horizontal / Rotación', 'Máquina', '3', 'acortamiento', false, 'abduccion_horizontal_hombro', 'Aislamiento escapular guiado.', '["Dorsal", "Hombro"]'),
    ('Curl de Biceps con Barra', 'Curl de Bíceps con Barra EZ', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Barra', '2', 'medio', false, 'flexoextension_codo', 'Flexión de codo con agarre EZ.', null),
    ('Curl Inclinado con Mancuernas', 'Curl Inclinado con Mancuernas (Banco 45°)', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Mancuerna', '1', 'estiramiento', false, 'flexoextension_codo', 'Pre-estiramiento en cabeza larga.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Predicador', 'Curl Predicador / Banco Scott con Barra EZ', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Barra', '3', 'estiramiento', false, 'flexoextension_codo', 'Sin inercia con apoyo de hombro.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Martillo', 'Curl Martillo con Mancuernas', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Mancuerna', '2', 'acortamiento', false, 'flexoextension_codo', 'Enfoque en braquiorradial.', null),
    ('Curl Concentrado', 'Curl Concentrado con Mancuerna', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Mancuerna', '3', 'acortamiento', false, 'flexoextension_codo', 'Aislamiento unilateral apoyado.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Press Francés', 'Press Francés con Barra EZ en Banco Plano', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Barra', '2', 'estiramiento', false, 'flexoextension_codo', 'Sobrecarga en flexión de codo.', null),
    ('Extensión de Tríceps Polea (Pushdown)', 'Extensiones en Polea Alta con Cuerda (Pushdown)', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', 'Acortamiento en pronación final.', null),
    ('Extensión de Tríceps sobre la Cabeza en Polea', 'Extensiones Overhead en Polea (Overhead)', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', '1', 'estiramiento', true, 'flexoextension_codo', 'Máximo estiramiento de cabeza larga.', '["Codo"]'),
    ('Press Cerrado', 'Press Cerrado en Banco Plano', 'Tríceps', 'horizontal_push', 'Multiarticular Libre', 'Barra', '2', 'medio', false, null, 'Sobrecarga pesada para tríceps.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Extensión de Tríceps sobre la Cabeza con Mancuerna', 'Copas con Mancuerna a dos Manos', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Mancuerna', '1', 'estiramiento', false, 'flexoextension_codo', 'Estiramiento overhead en pesas libres.', '["Codo"]'),
    ('Patada de Tríceps', 'Patada de Tríceps en Polea Baja', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', 'Acortamiento completo posterior.', '["Codo"]'),
    ('Elevación de Talones (Calf Raise)', 'Elevación de Talones De Pie en Máquina', 'Gemelos', 'isolation_accessory', 'Plantiflexión (Pantorrillas)', 'Máquina', '3', 'acortamiento', false, 'plantiflexion', 'Gastrocnemio con rodilla extendida.', null),
    ('Elevación de Talones Sentado', 'Elevación de Talones Sentado en Máquina', 'Gemelos', 'isolation_accessory', 'Plantiflexión (Pantorrillas)', 'Máquina', '3', 'acortamiento', false, 'plantiflexion', 'Aísla sóleo con rodilla flexionada.', '["Tobillo", "Pie"]'),
    ('Crunch Abdominal', 'Crunch Abdominal en Polea De Pie / Hincado', 'Core', 'core_anti_flexion_extension', 'Monoarticular / Aislamiento', 'Polea', null, 'acortamiento', false, 'core_anti_extension_rotacion', 'Sobrecarga progresiva en columna.', null),
    ('Rueda Abdominal (Ab Wheel)', 'Rueda Abdominal (Ab Wheel Rollout)', 'Core', 'core_anti_flexion_extension', 'Anti-Extensión / Anti-Rotación', 'Peso corporal', null, 'estiramiento', false, 'core_anti_extension_rotacion', 'Anti-extensión de alta demanda.', null),
    ('Plancha Abdominal (Plank)', 'Plancha Isométrica (Plank)', 'Core', 'core_anti_flexion_extension', 'Isométrico / Tensión Estática', 'Peso corporal', null, null, false, 'core_anti_extension_rotacion', 'Estabilidad postural estática.', null)
  ) as v(viejo, nombre, musculo, patron, tipo, equipo, jerarquia, perfil, guiada, complementario, nota, contra)
 where e.name = v.viejo;

-- 2. Los nuevos -----------------------------------------------------------------

insert into public.exercise_library
  (name, target_muscle, movement_pattern, biomechanical_type, equipment, hierarchy_level,
   length_profile, is_guided, complementary_pattern, description, contraindications)
select v.nombre, v.musculo, v.patron, v.tipo, v.equipo, v.jerarquia::smallint,
       v.perfil, v.guiada, v.complementario, v.nota, v.contra::jsonb
  from (values
    ('Press Declinado con Barra', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Barra', null, 'medio', false, null, 'Enfoque en fibras costales e inferiores.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Press Declinado con Mancuernas', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Mancuerna', null, 'estiramiento', false, null, 'Convergencia superior en aducción.', '["Hombro", "Codo", "Hipertensión / Cardiovascular"]'),
    ('Press de Banca con Agarre Estrecho', 'Pectoral', 'horizontal_push', 'Multiarticular Libre', 'Barra', null, 'medio', false, null, 'Mayor demanda de tríceps y porción esternal.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hipertensión / Cardiovascular"]'),
    ('Aperturas con Mancuernas en Banco Plano', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', null, 'estiramiento', false, null, 'Tensión en estiramiento en plano transversal.', '["Hombro"]'),
    ('Aperturas Inclinadas con Mancuernas (30°)', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', null, 'estiramiento', false, null, 'Aislamiento de porción clavicular.', '["Hombro"]'),
    ('Aperturas / Cruces en Polea Baja a Alta', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Polea', '3', 'acortamiento', false, null, 'Pico de contracción superior constante.', '["Hombro"]'),
    ('Cruces en Polea Alta a Baja', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Polea', '3', 'acortamiento', false, null, 'Aducción completa fibras inferiores.', '["Hombro"]'),
    ('Pullover con Mancuerna en Banco', 'Pectoral', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', null, 'estiramiento', false, null, 'Tensión en estiramiento en banco.', '["Hombro", "Codo"]'),
    ('Press Svend con Disco / Mancuerna', 'Pectoral', 'isolation_accessory', 'Isométrico / Tensión Estática', 'Mancuerna', '3', 'acortamiento', false, null, 'Compresión constante al centro.', '["Hombro"]'),
    ('Jalón Neutro Uni/Bilateral en Polea', 'Dorsal', 'vertical_pull', 'Multiarticular Unilateral', 'Polea', null, 'estiramiento', false, null, 'Trayectoria pegada al torso.', '["Hombro", "Codo"]'),
    ('Jalón con Agarre Supino Cerrado', 'Dorsal', 'vertical_pull', 'Multiarticular Guiado', 'Polea', null, 'estiramiento', true, null, 'Mayor contribución del bíceps.', '["Hombro", "Codo"]'),
    ('Jalón al Pecho Agarre V (Estrecho)', 'Dorsal', 'vertical_pull', 'Multiarticular Guiado', 'Polea', null, 'medio', true, null, 'Confort articular para muñecas.', '["Hombro", "Codo"]'),
    ('Dominadas Supinas / Neutras (Pull-ups)', 'Dorsal', 'vertical_pull', 'Multiarticular Peso Corp.', 'Peso corporal', null, 'estiramiento', false, null, 'Demanda de estabilidad central.', '["Hombro", "Codo", "Muñeca/Antebrazo", "Hernia discal / Patología axial"]'),
    ('Remo Gironda Agarre Ancho Prono', 'Dorsal', 'horizontal_pull', 'Multiarticular Guiado', 'Polea', null, 'acortamiento', true, null, 'Enfoque en espalda alta.', '["Lumbar", "Codo", "Hernia discal / Patología axial"]'),
    ('Pullover con Mancuerna en Banco Horizontal', 'Dorsal', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', null, 'estiramiento', false, null, 'Estiramiento profundo.', '["Hombro", "Codo"]'),
    ('Remo Seal Row (Banco Elevado)', 'Dorsal', 'horizontal_pull', 'Multiarticular Libre', 'Barra', null, 'medio', false, null, 'Aislamiento biomecánico horizontal.', '["Codo"]'),
    ('Remo en Máquina Lever / T-Bar con Agarre Apoyado', 'Dorsal', 'horizontal_pull', 'Multiarticular Guiado', 'Máquina', null, 'estiramiento', true, null, 'Gran estabilidad para cargas altas.', '["Codo"]'),
    ('Remo Meadows con Barra T (Unilateral)', 'Dorsal', 'horizontal_pull', 'Multiarticular Unilateral', 'Barra', null, 'estiramiento', false, null, 'Tracción técnica unilateral.', '["Lumbar", "Dorsal", "Cadera", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Encogimientos con Mancuernas', 'Trapecio', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', '3', 'acortamiento', false, null, 'Alineación lateral anatómica.', '["Cervical", "Hombro", "Hipertensión / Cardiovascular"]'),
    ('Sentadilla Pendular (Pendulum Squat)', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Guiado', 'Máquina', null, 'estiramiento', true, null, 'Trayectoria biomecánica curva.', '["Lumbar", "Cadera", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'),
    ('Prensa Horizontal', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Guiado', 'Máquina', null, 'medio', true, null, 'Tensión constante con placas.', '["Lumbar", "Cadera", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'),
    ('Sentadilla Goblet con Talones Elevados', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Libre', 'Mancuerna', null, 'estiramiento', false, null, 'Dorsiflexión asistida para VMO.', '["Tobillo", "Hipertensión / Cardiovascular"]'),
    ('Belt Squat (Sentadilla de Cinturón)', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Guiado', 'Máquina', null, 'estiramiento', true, null, 'Cero compresión espinal.', '["Lumbar", "Cadera", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'),
    ('Sentadilla Zercher', 'Cuádriceps', 'squat_dominante_rodilla', 'Multiarticular Libre', 'Barra', null, 'estiramiento', false, null, 'Carga frontal en codos y demanda de core.', '["Dorsal", "Lumbar", "Muñeca/Antebrazo", "Tobillo", "Hernia discal / Patología axial", "Hipertensión / Cardiovascular"]'),
    ('Peso Muerto Rumano con Mancuernas', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Mancuerna', null, 'estiramiento', false, null, 'Ajuste libre de trayectoria lateral.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Peso Muerto Piernas Rígidas (Stiff-Leg)', 'Isquiosurales', 'hip_hinge_dominante_cadera', 'Multiarticular Libre', 'Barra', null, 'estiramiento', false, null, 'Mayor flexión de cadera desde el suelo.', '["Lumbar", "Cadera", "Tobillo", "Hernia discal / Patología axial", "Diástasis abdominal"]'),
    ('Aducción de Cadera en Máquina', 'Aductores', 'isolation_accessory', 'Abducción / Aducción de Cadera', 'Máquina', '3', 'acortamiento', false, 'abduccion_aduccion_cadera', 'Densidad de muslo interno.', '["Cadera"]'),
    ('Copenhague Plank (Adductor Plank)', 'Aductores', 'isolation_accessory', 'Isométrico / Tensión Estática', 'Peso corporal', null, null, false, 'abduccion_aduccion_cadera', 'Salud e isometría articular en ingle.', '["Cadera"]'),
    ('Elevaciones Laterales en Banco Inclinado Recostado', 'Deltoides', 'isolation_accessory', 'Abducción / Elevación de Hombro', 'Mancuerna', null, 'estiramiento', false, 'elevacion_hombro', 'Perfil modificado en estiramiento.', '["Hombro"]'),
    ('Elevaciones Laterales en Máquina Específica', 'Deltoides', 'isolation_accessory', 'Abducción / Elevación de Hombro', 'Máquina', '3', 'acortamiento', false, 'elevacion_hombro', 'Guiado estricto sin inercia.', '["Hombro"]'),
    ('Elevaciones Frontales con Mancuernas / Disco', 'Deltoides', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Mancuerna', '3', 'acortamiento', false, null, 'Flexión directa de hombro.', '["Hombro"]'),
    ('Curl de Bíceps de Espaldas a la Polea (Bayesian)', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', null, 'estiramiento', false, 'flexoextension_codo', 'Tensión continua en hiperextensión.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl Martillo en Polea Baja con Cuerda', 'Bíceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', 'Tensión continua con cable.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Extensiones en Polea Alta con Barra Recta / V', 'Tríceps', 'isolation_accessory', 'Flexión / Extensión de Codo', 'Polea', '3', 'acortamiento', false, 'flexoextension_codo', 'Sobrecarga pesada en extensión.', '["Codo"]'),
    ('Curl de Muñeca Supino con Barra (Antebrazo)', 'Antebrazo', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Barra', '3', 'acortamiento', false, null, 'Aislamiento de flexores de muñeca.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Curl de Muñeca Prono con Barra (Antebrazo Inverso)', 'Antebrazo', 'isolation_accessory', 'Monoarticular / Aislamiento', 'Barra', '3', 'acortamiento', false, null, 'Aislamiento de extensores de muñeca.', '["Codo", "Muñeca/Antebrazo"]'),
    ('Elevación de Talones en Prensa de Piernas', 'Gemelos', 'isolation_accessory', 'Plantiflexión (Pantorrillas)', 'Máquina', null, 'estiramiento', false, 'plantiflexion', 'Gran rango y sobrecarga.', '["Tobillo", "Pie"]'),
    ('Elevaciones de Piernas Colgado en Barra', 'Core', 'core_anti_flexion_extension', 'Multiarticular Peso Corp.', 'Barra', null, 'estiramiento', false, 'core_anti_extension_rotacion', 'Trabajo completo de pared abdominal.', '["Lumbar", "Hombro", "Hernia discal / Patología axial", "Diástasis abdominal", "Embarazo"]'),
    ('Press Pallof en Polea', 'Core', 'core_anti_flexion_extension', 'Anti-Extensión / Anti-Rotación', 'Polea', null, null, false, 'core_anti_extension_rotacion', 'Resistencia rotacional.', '["Lumbar", "Hombro", "Diástasis abdominal", "Embarazo"]'),
    ('Crunch Abdominal en Máquina Específica', 'Core', 'core_anti_flexion_extension', 'Monoarticular / Aislamiento', 'Máquina', null, 'acortamiento', false, 'core_anti_extension_rotacion', 'Guiado con carga exacta.', '["Cervical", "Lumbar", "Hernia discal / Patología axial", "Diástasis abdominal"]')
  ) as v(nombre, musculo, patron, tipo, equipo, jerarquia, perfil, guiada, complementario, nota, contra);

-- 3. Las reglas que los nombran ----------------------------------------------------

update public.rules
   set is_active = false
 where is_active
   and rule_key in ('dominancia-cadera', 'dominancia-rodilla', 'dorsiflexion-severa', 'embarazo-post-primer-trimestre', 'flexion-hombro-restringida', 'pico-ovulatorio-laxitud', 'rotacion-externa-hombro-limitada', 'vector-espalda-anchura', 'vector-espalda-densidad', 'vector-gluteo-anteroposterior', 'vector-gluteo-vertical-lateral');

insert into public.rules
  (rule_key, version, nivel, condition, actions, justification, evidence_level, is_active)
select r.rule_key,
       r.version + 1,
       r.nivel,
       r.condition,
       n.acciones::jsonb,
       r.justification,
       r.evidence_level,
       true
  from public.rules r
  join (values
    ('dominancia-cadera', '{"priorizar": ["Hack Libre", "Sentadilla Sissy (Sissy Squat Libre / Guiada)", "Extensión de Rodilla en Máquina"], "ratio_patron": {"hip_hinge_dominante_cadera": 0.4, "squat_dominante_rodilla": 0.6}}'),
    ('dominancia-rodilla', '{"priorizar": ["Peso Muerto Rumano con Barra (RDL)", "Hip Thrust con Barra en Banco"], "ratio_patron": {"hip_hinge_dominante_cadera": 0.6, "squat_dominante_rodilla": 0.4}}'),
    ('dorsiflexion-severa', '{"excluir_ejercicios": ["Sentadilla Libre Trasera (High Bar)", "Hack Libre"], "sustituir_por": ["Sentadilla Heels-Elevated", "Prensa de Piernas 45°", "Sentadilla Búlgaro con Mancuernas"]}'),
    ('embarazo-post-primer-trimestre', '{"excluir_ejercicios": ["Sentadilla Libre Trasera (High Bar)", "Sentadilla Libre Trasera (Low Bar)", "Peso Muerto Convencional", "Glute Bridge con Barra / Disco"], "modificador": "Priorizar posiciones sentadas o inclinadas y apoyo unilateral controlado; evitar decúbito prono, cargas axiales y riesgo de impacto", "sustituir_por": ["Prensa de Piernas 45°", "Sentadilla Búlgaro con Mancuernas"]}'),
    ('flexion-hombro-restringida', '{"excluir_ejercicios": ["Press Militar tras Nuca", "Press Militar De Pie con Barra"], "sustituir_por": ["Press Inclinado a 60°", "Press en Plano Escapular"]}'),
    ('pico-ovulatorio-laxitud', '{"modificador": "Priorizar máquinas y cadena cinética cerrada: mayor laxitud ligamentaria en el pico ovulatorio", "priorizar": ["Prensa de Piernas 45°", "Prensa Inclinada de Piernas", "Extensión de Rodilla en Máquina"]}'),
    ('rotacion-externa-hombro-limitada', '{"excluir_ejercicios": ["Sentadilla Libre Trasera (Low Bar)"], "sustituir_por": ["Sentadilla Goblet", "Sentadilla con Safety Bar", "Sentadilla Frontal con Barra"]}'),
    ('vector-espalda-anchura', '{"priorizar": ["Jalón al Pecho Agarre Abierto Prono", "Dominadas Pronas Agarre Ancho", "Pullover en Polea Alta con Cuerda / Barra"]}'),
    ('vector-espalda-densidad', '{"priorizar": ["Remo con Barra 45° (Bent-Over Row)", "Remo Gironda (Polea Baja Agarre Estrecho)", "Remo con Mancuerna Unilateral (Apoyo en Banco)"]}'),
    ('vector-gluteo-anteroposterior', '{"priorizar": ["Hip Thrust con Barra en Banco", "Glute Bridge con Barra / Disco", "Patada de Glúteo en Polea (Cable Kickback)"]}'),
    ('vector-gluteo-vertical-lateral', '{"priorizar": ["Sentadilla Búlgaro con Mancuernas", "Zancadas / Lunges Caminando con Mancuernas", "Abducción en Polea De Pie / Inclinado"]}')
  ) as n(rule_key, acciones) on n.rule_key = r.rule_key
 where r.version = (select max(x.version) from public.rules x where x.rule_key = r.rule_key);

-- 4. Comprobación ---------------------------------------------------------------

do $$
declare
  faltan text;
  huerfanos text;
begin
  select string_agg(n, ', ') into faltan
    from unnest(array['Press de Banca Plano con Barra', 'Press Inclinado con Mancuernas (30°)', 'Press Declinado con Barra', 'Press Declinado con Mancuernas', 'Press Convergente en Máquina (Articulado)', 'Press Inclinado en Máquina Hammer Strength', 'Press Plano en Máquina Smith / Multipower', 'Press Inclinado en Máquina Smith (30°-45°)', 'Press de Banca con Agarre Estrecho', 'Press Inclinado con Barra (30°)', 'Aperturas con Mancuernas en Banco Plano', 'Aperturas Inclinadas con Mancuernas (30°)', 'Aperturas / Cruces en Polea Baja a Alta', 'Cruces en Polea Alta a Baja', 'Cruces en Polea Media (A nivel de pecho)', 'Contractor / Pec Deck Machine', 'Fondos en Paralelas para Pecho (Dips)', 'Pullover con Mancuerna en Banco', 'Press Svend con Disco / Mancuerna', 'Jalón al Pecho Agarre Abierto Prono', 'Jalón Neutro Uni/Bilateral en Polea', 'Jalón con Agarre Supino Cerrado', 'Jalón al Pecho Agarre V (Estrecho)', 'Dominadas Supinas / Neutras (Pull-ups)', 'Dominadas Pronas Agarre Ancho', 'Remo con Barra Prono (Pendlay Row)', 'Remo con Barra 45° (Bent-Over Row)', 'Remo con Mancuerna Unilateral (Apoyo en Banco)', 'Remo Gironda (Polea Baja Agarre Estrecho)', 'Remo Gironda Agarre Ancho Prono', 'Remo con Apoyo Pecho (Chest-Supported Row)', 'Pullover en Polea Alta con Cuerda / Barra', 'Pullover con Mancuerna en Banco Horizontal', 'Remo Seal Row (Banco Elevado)', 'Remo en Máquina Lever / T-Bar con Agarre Apoyado', 'Remo Meadows con Barra T (Unilateral)', 'Encogimientos de Hombros con Barra (Shrugs)', 'Encogimientos con Mancuernas', 'Sentadilla Libre Trasera (High Bar)', 'Sentadilla Libre Trasera (Low Bar)', 'Sentadilla Frontal con Barra', 'Sentadilla Pendular (Pendulum Squat)', 'Sentadilla Hack (Hack Squat Machine)', 'Sentadilla Sissy (Sissy Squat Libre / Guiada)', 'Prensa de Piernas 45°', 'Prensa Horizontal', 'Extensión de Rodilla en Máquina', 'Sentadilla Búlgaro con Mancuernas', 'Zancadas / Lunges Caminando con Mancuernas', 'Sentadilla Goblet con Talones Elevados', 'Belt Squat (Sentadilla de Cinturón)', 'Sentadilla Zercher', 'Peso Muerto Rumano con Barra (RDL)', 'Peso Muerto Rumano con Mancuernas', 'Peso Muerto Piernas Rígidas (Stiff-Leg)', 'Curl Femoral Tumbado (Prone Leg Curl)', 'Curl Femoral Sentado (Seated Leg Curl)', 'Curl Femoral De Pie Unilateral', 'Peso Muerto Convencional', 'Peso Muerto Sumo', 'Buenos Días con Barra (Good Mornings)', 'Nordic Hamstring Curl (Curl Nórdico)', 'Hip Thrust con Barra en Banco', 'Glute Bridge con Barra / Disco', 'Hip Thrust en Máquina Específica (Booty Builder)', 'Patada de Glúteo en Polea (Cable Kickback)', 'Abducción de Cadera Sentado en Máquina', 'Abducción en Polea De Pie / Inclinado', 'Step-Up en Banco con Mancuerna (Glúteo)', 'Aducción de Cadera en Máquina', 'Copenhague Plank (Adductor Plank)', 'Press Militar De Pie con Barra', 'Press Militar Sentado con Mancuernas', 'Press de Hombros Arnold (Arnold Press)', 'Press Militar en Máquina Guiada', 'Elevaciones Laterales con Mancuernas', 'Elevaciones Laterales en Polea (Tras Espalda)', 'Elevaciones Laterales en Banco Inclinado Recostado', 'Elevaciones Laterales en Máquina Específica', 'Pájaros con Mancuernas (Rear Delt Fly)', 'Face Pulls con Cuerda en Polea Alta', 'Inverted Reverse Pec Deck (Deltoides Posterior)', 'Elevaciones Frontales con Mancuernas / Disco', 'Curl de Bíceps con Barra EZ', 'Curl Inclinado con Mancuernas (Banco 45°)', 'Curl Predicador / Banco Scott con Barra EZ', 'Curl de Bíceps de Espaldas a la Polea (Bayesian)', 'Curl Martillo con Mancuernas', 'Curl Martillo en Polea Baja con Cuerda', 'Curl Concentrado con Mancuerna', 'Press Francés con Barra EZ en Banco Plano', 'Extensiones en Polea Alta con Cuerda (Pushdown)', 'Extensiones en Polea Alta con Barra Recta / V', 'Extensiones Overhead en Polea (Overhead)', 'Press Cerrado en Banco Plano', 'Copas con Mancuerna a dos Manos', 'Patada de Tríceps en Polea Baja', 'Curl de Muñeca Supino con Barra (Antebrazo)', 'Curl de Muñeca Prono con Barra (Antebrazo Inverso)', 'Elevación de Talones De Pie en Máquina', 'Elevación de Talones Sentado en Máquina', 'Elevación de Talones en Prensa de Piernas', 'Crunch Abdominal en Polea De Pie / Hincado', 'Elevaciones de Piernas Colgado en Barra', 'Rueda Abdominal (Ab Wheel Rollout)', 'Plancha Isométrica (Plank)', 'Press Pallof en Polea', 'Crunch Abdominal en Máquina Específica']) as n
   where not exists (select 1 from public.exercise_library e where e.name = n and e.is_active);
  if faltan is not null then
    raise exception 'De los 108 faltan o están archivados: %', faltan;
  end if;

  -- Ninguna regla activa puede nombrar un ejercicio que no esté activo.
  select string_agg(distinct r.rule_key || ' → ' || n, ', ') into huerfanos
    from public.rules r,
         jsonb_array_elements_text(
           coalesce(r.actions -> 'priorizar', '[]') ||
           coalesce(r.actions -> 'excluir_ejercicios', '[]') ||
           coalesce(r.actions -> 'sustituir_por', '[]')) as n
   where r.is_active
     and not exists (select 1 from public.exercise_library e where e.name = n and e.is_active);
  if huerfanos is not null then
    raise exception 'Reglas que nombran ejercicios que no están: %', huerfanos;
  end if;
end $$;
