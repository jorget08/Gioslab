-- 1.9 — Datos de prueba.
--
-- Se ejecuta solo con `npx supabase db reset` en el entorno local.
-- Para el proyecto remoto: pegar este archivo en el SQL Editor de Supabase.
-- Es idempotente: borra lo suyo antes de crearlo, así que se puede repetir.
--
-- Contraseña de todas las cuentas: clave-de-prueba
--
-- ATENCIÓN: los correos terminan en @gioslab.test a propósito. Es un dominio
-- reservado que no existe, así que ningún correo de estos puede salir a una
-- persona real por accidente.
--
-- El vocabulario de las evaluaciones sale de las fichas de Giovanni
-- (docs/ESPECIFICACION-FICHAS.md), no está inventado: 'Largo', 'Promedio',
-- 'Limitada (5-10 cm)', 'Fémur Largo / Torso Corto'… Así el wizard del grupo 2
-- se construye contra los valores reales desde el primer día.

-- ---------------------------------------------------------------------------
-- Limpieza
-- ---------------------------------------------------------------------------
delete from auth.users where email like '%@gioslab.test';
delete from public.tenants where id in (
  '00000000-1111-0000-0000-000000000001',
  '00000000-1111-0000-0000-000000000002'
);
delete from public.rules where rule_key like 'seed-%';
delete from public.exercise_library where name like '[demo]%';

-- ---------------------------------------------------------------------------
-- Cuentas
-- ---------------------------------------------------------------------------
--
-- Se insertan directamente en auth.users. Hacen falta DOS cosas para que el
-- inicio de sesión funcione de verdad:
--   1. La contraseña cifrada con bcrypt, no en claro.
--   2. Una fila en auth.identities. Sin ella el usuario existe pero no puede
--      entrar, y el fallo no dice por qué.
--   3. Las columnas de token en CADENA VACÍA, no NULL. GoTrue las lee como
--      texto y con NULL revienta con "Database error querying schema", un
--      mensaje que no apunta a nada. Es la trampa clásica de sembrar auth.users
--      a mano.

create or replace function pg_temp.crear_cuenta(
  p_id uuid, p_email text, p_nombre text
) returns void language plpgsql as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token,
    email_change, email_change_token_new, email_change_token_current
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, extensions.crypt('clave-de-prueba', extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_nombre),
    '', '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, created_at, updated_at
  ) values (
    gen_random_uuid(), p_id, p_email, 'email',
    jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
    now(), now()
  );
end;
$$;

-- El trigger handle_new_user crea el perfil en public.users con el nombre.
select pg_temp.crear_cuenta('00000000-2222-0000-0000-00000000000a',
       'admin@gioslab.test',    'Giovanni Quiroz');
select pg_temp.crear_cuenta('00000000-2222-0000-0000-00000000000b',
       'gimnasio@gioslab.test', 'Carolina Vélez');
select pg_temp.crear_cuenta('00000000-2222-0000-0000-00000000000c',
       'ana@gioslab.test',      'Ana Buitrago');
select pg_temp.crear_cuenta('00000000-2222-0000-0000-00000000000d',
       'diego@gioslab.test',    'Diego Salazar');

update public.users set is_super_admin = true
 where id = '00000000-2222-0000-0000-00000000000a';

-- ---------------------------------------------------------------------------
-- Espacios de trabajo
-- ---------------------------------------------------------------------------
insert into public.tenants (id, type, name, plan) values
  ('00000000-1111-0000-0000-000000000001', 'gym',  'Gimnasio Central GQ', 'pro'),
  ('00000000-1111-0000-0000-000000000002', 'solo', 'Diego Salazar',        'trial');

-- Carolina administra el gimnasio; Ana entrena allí.
insert into public.memberships (user_id, tenant_id, role) values
  ('00000000-2222-0000-0000-00000000000b', '00000000-1111-0000-0000-000000000001', 'gym'),
  ('00000000-2222-0000-0000-00000000000c', '00000000-1111-0000-0000-000000000001', 'trainer');

-- Diego es el caso interesante: trabaja en el gimnasio Y tiene alumnos propios.
-- Es el que permite probar el selector de espacio de trabajo sin montar nada.
insert into public.memberships (user_id, tenant_id, role) values
  ('00000000-2222-0000-0000-00000000000d', '00000000-1111-0000-0000-000000000001', 'trainer'),
  ('00000000-2222-0000-0000-00000000000d', '00000000-1111-0000-0000-000000000002', 'trainer');

-- ---------------------------------------------------------------------------
-- Atletas
-- ---------------------------------------------------------------------------
insert into public.athletes
  (id, tenant_id, trainer_id, full_name, birth_date, sex, training_goal, experience_level)
values
  -- Este es el caso de la ficha de Giovanni. Sus valores están replicados al
  -- decimal en tests/unit/composicion-corporal.test.ts.
  ('00000000-3333-0000-0000-000000000001', '00000000-1111-0000-0000-000000000001',
   '00000000-2222-0000-0000-00000000000c', 'María Fernanda Gómez', '1996-05-15', 'femenino',
   'Hipertrofia (Masa Muscular)', 'Intermedio'),

  ('00000000-3333-0000-0000-000000000002', '00000000-1111-0000-0000-000000000001',
   '00000000-2222-0000-0000-00000000000c', 'Andrés Motta', '1994-02-11', 'masculino',
   'Recomposición Corporal', 'Avanzado'),

  ('00000000-3333-0000-0000-000000000003', '00000000-1111-0000-0000-000000000001',
   '00000000-2222-0000-0000-00000000000d', 'Laura Restrepo', '1999-09-03', 'femenino',
   'Pérdida de Grasa', 'Principiante'),

  ('00000000-3333-0000-0000-000000000004', '00000000-1111-0000-0000-000000000001',
   '00000000-2222-0000-0000-00000000000d', 'Sebastián Ochoa', '1990-11-27', 'masculino',
   'Rendimiento Deportivo', 'Deportista'),

  -- Alumna particular de Diego: pertenece a SU tenant, no al gimnasio. Si Diego
  -- dejara el gimnasio, esta se va con él y las otras se quedan.
  ('00000000-3333-0000-0000-000000000005', '00000000-1111-0000-0000-000000000002',
   '00000000-2222-0000-0000-00000000000d', 'Valentina Hoyos', '2001-07-19', 'femenino',
   'Hipertrofia (Masa Muscular)', 'Principiante');

-- ---------------------------------------------------------------------------
-- Mediciones antropométricas
-- ---------------------------------------------------------------------------
--
-- María Fernanda lleva DOS tomas con seis meses de diferencia: es lo que hace
-- visible la evolución, que es el valor del producto (§3.5). Los valores
-- calculados de la primera son los del Excel de Giovanni, verificados.

insert into public.anthropometric_measurements
  (athlete_id, tenant_id, measured_at, height_cm, weight_kg,
   triceps_mm, subscapular_mm, suprailiac_mm, abdominal_mm, thigh_mm, calf_mm, chest_mm,
   waist_cm, hip_cm, sum_6_skinfolds_mm, sum_7_skinfolds_mm,
   body_density, body_fat_pct, fat_mass_kg, lean_mass_kg, bmi, waist_hip_ratio)
values
  ('00000000-3333-0000-0000-000000000001', '00000000-1111-0000-0000-000000000001',
   '2026-02-10', 165.0, 62.5, 12.0, 10.0, 14.0, 16.0, 18.0, 8.0, 6.0, 68.0, 96.0,
   78.0, 84.0, 1.05765, 18.0, 11.3, 51.2, 23.0, 0.708),

  ('00000000-3333-0000-0000-000000000001', '00000000-1111-0000-0000-000000000001',
   '2026-08-10', 165.0, 61.0, 10.5, 9.0, 12.0, 13.5, 16.0, 7.5, 5.5, 66.0, 96.5,
   68.5, 74.0, 1.06229, 15.9, 9.7, 51.3, 22.4, 0.684);

insert into public.anthropometric_measurements
  (athlete_id, tenant_id, measured_at, height_cm, weight_kg,
   triceps_mm, subscapular_mm, suprailiac_mm, abdominal_mm, thigh_mm, calf_mm, chest_mm,
   waist_cm, hip_cm)
values
  ('00000000-3333-0000-0000-000000000002', '00000000-1111-0000-0000-000000000001',
   '2026-07-02', 178.0, 82.4, 8.0, 12.0, 14.0, 18.0, 11.0, 7.0, 6.5, 84.0, 99.0),
  ('00000000-3333-0000-0000-000000000003', '00000000-1111-0000-0000-000000000001',
   '2026-08-01', 158.5, 68.2, 18.0, 16.0, 22.0, 26.0, 28.0, 14.0, 9.0, 79.0, 104.0),
  ('00000000-3333-0000-0000-000000000005', '00000000-1111-0000-0000-000000000002',
   '2026-08-05', 170.0, 58.0, 14.0, 11.0, 13.0, 15.0, 20.0, 9.0, 6.0, 67.0, 94.0);

-- ---------------------------------------------------------------------------
-- Evaluaciones biomecánicas
-- ---------------------------------------------------------------------------
-- MICRO únicamente: lo que el entrenador mide. El macro
-- (Eficiente/Compensada/De Riesgo) lo produce el motor y no se siembra.
--
-- Los tres perfiles están escogidos para que el motor del grupo 3 se construya
-- contra casos que disparan reglas distintas:
--   atleta 1  dorsiflexión limitada + fémur largo  → sentadilla comprometida
--   atleta 2  todo en rango                        → sin restricción
--   atleta 4  dorsiflexión severa + cifosis        → dos exclusiones a la vez

insert into public.biomech_evaluations
  (athlete_id, tenant_id, evaluated_at, femur_class, torso_class,
   ankle_dorsiflexion_cm, hip_flexion_deg, hip_internal_rotation_deg,
   thoracic_extension, shoulder_flexion_deg, shoulder_external_rotation_deg,
   squat_dominance, femur_torso_ratio, axial_load_tolerance,
   glute_vector, back_dominance)
values
  ('00000000-3333-0000-0000-000000000001', '00000000-1111-0000-0000-000000000001',
   '2026-02-10', 'Largo', 'Corto',
   7.5, 130, 25, 'Normal', 180, 90,
   'Dominante de Cadera', 'Fémur Largo / Torso Corto', 'Tolerancia Normal',
   'Vector Horizontal', 'Vector Vertical (Dorsal)'),

  ('00000000-3333-0000-0000-000000000002', '00000000-1111-0000-0000-000000000001',
   '2026-07-02', 'Promedio', 'Promedio',
   12.0, 135, 40, 'Normal', 180, 90,
   'Dominante de Rodilla', 'Proporción Equilibrada', 'Tolerancia Normal',
   'Vector Vertical', 'Vector Horizontal (Grosor)'),

  ('00000000-3333-0000-0000-000000000004', '00000000-1111-0000-0000-000000000001',
   '2026-06-20', 'Largo', 'Promedio',
   3.5, 125, 22, 'Cifótica', 150, 70,
   'Dominante de Cadera', 'Fémur Largo / Torso Corto',
   'Sensibilidad Lumbar', 'Vector Horizontal', 'Vector Vertical (Dorsal)');

-- ---------------------------------------------------------------------------
-- Módulo FEMTECH
-- ---------------------------------------------------------------------------
insert into public.menstrual_cycle_logs
  (athlete_id, tenant_id, last_period_start, cycle_length_days, uses_hormonal_contraception)
values
  ('00000000-3333-0000-0000-000000000001', '00000000-1111-0000-0000-000000000001',
   current_date - 9, 28, false),
  ('00000000-3333-0000-0000-000000000003', '00000000-1111-0000-0000-000000000001',
   current_date - 20, 30, true);

-- ---------------------------------------------------------------------------
-- Biblioteca y reglas
-- ---------------------------------------------------------------------------
-- Cinco ejercicios y tres reglas sacadas literalmente de las fichas
-- (ESPECIFICACION-FICHAS.md §4). Sirven para que el motor del grupo 3 se
-- construya contra reglas reales en vez de inventadas.

-- Las contraindicaciones cubren las DOS familias que definió Giovanni: zonas
-- anatómicas (el motor descarta el ejercicio) y condiciones sistémicas (además
-- le cambia la ejecución). La sentadilla trasera pesada es el caso claro de las
-- dos a la vez.
insert into public.exercise_library
  (id, name, target_muscle, movement_pattern, biomechanical_type, contraindications)
values
  ('00000000-4444-0000-0000-000000000001', '[demo] Sentadilla Barra Alta con Tacón',
   'cuádriceps', 'squat_dominante_rodilla', 'rodilla dominante',
   '["Rodilla"]'::jsonb),
  ('00000000-4444-0000-0000-000000000002', '[demo] Prensa 45°',
   'cuádriceps', 'squat_dominante_rodilla', 'rodilla dominante',
   '["Rodilla"]'::jsonb),
  ('00000000-4444-0000-0000-000000000003', '[demo] Sentadilla Trasera con Barra',
   'cuádriceps', 'squat_dominante_rodilla', 'mixto',
   '["Lumbar","Rodilla","Hernia discal / Patología axial","Hipertensión / Cardiovascular"]'::jsonb),
  ('00000000-4444-0000-0000-000000000004', '[demo] Hip Thrust',
   'glúteo mayor', 'hip_hinge_dominante_cadera', 'cadera dominante',
   '["Embarazo"]'::jsonb),
  ('00000000-4444-0000-0000-000000000005', '[demo] Press Militar con Barra',
   'deltoides', 'vertical_push', 'vertical',
   '["Hombro","Cervical","Hipertensión / Cardiovascular"]'::jsonb);

insert into public.exercise_variants (exercise_id, variant_exercise_id, relation_type)
values
  ('00000000-4444-0000-0000-000000000003', '00000000-4444-0000-0000-000000000002', 'sustitucion'),
  ('00000000-4444-0000-0000-000000000003', '00000000-4444-0000-0000-000000000001', 'sustitucion');

insert into public.rules
  (rule_key, version, condition, actions, justification, evidence_level, is_active, created_by)
values
  ('seed-dorsiflexion-limitada', 1,
   '{"dorsiflexion_severidad":"Limitada"}'::jsonb,
   '{"priorizar":["[demo] Sentadilla Barra Alta con Tacón"],"excluir":[]}'::jsonb,
   'Sugerir calzado de elevación o disco en sentadillas. Bloquear variantes de rango profundo.',
   'LEVEL_B_BIOMECHANICS', true, '00000000-2222-0000-0000-00000000000a'),

  ('seed-dorsiflexion-severa', 1,
   '{"dorsiflexion_severidad":"Severa"}'::jsonb,
   '{"priorizar":["[demo] Prensa 45°"],"excluir":["[demo] Sentadilla Trasera con Barra"]}'::jsonb,
   'Priorizar Hack Squat y Prensa 45° más trabajo de movilidad de tobillo.',
   'LEVEL_B_BIOMECHANICS', true, '00000000-2222-0000-0000-00000000000a'),

  ('seed-femur-largo-torso-corto', 1,
   '{"femur_torso_ratio":"Fémur Largo / Torso Corto"}'::jsonb,
   '{"excluir":["[demo] Sentadilla Trasera con Barra"],"priorizar":["[demo] Prensa 45°"]}'::jsonb,
   'Sustituir Sentadilla Trasera con Barra por Front Squat, Goblet o Prensa para reducir el cizallamiento lumbar.',
   'LEVEL_B_BIOMECHANICS', true, '00000000-2222-0000-0000-00000000000a');

-- ---------------------------------------------------------------------------
-- Consentimientos (Ley 1581)
-- ---------------------------------------------------------------------------
insert into public.athlete_consents (athlete_id, tenant_id, policy_version, granted_by)
select id, tenant_id, 'v1-2026-08', trainer_id from public.athletes
where id::text like '00000000-3333-%';

-- Condiciones fisiológicas. Andrés es el caso que enseña para qué sirven: el
-- motor no le quita la sentadilla, le cambia CÓMO la ejecuta (sin Valsalva, sin
-- series al fallo). Es la diferencia entre las dos familias.
insert into public.athlete_conditions (athlete_id, tenant_id, condition, notes)
values
  ('00000000-3333-0000-0000-000000000002', '00000000-1111-0000-0000-000000000001',
   'Hipertensión / Cardiovascular', 'Controlada con medicación; reportada por el atleta'),
  ('00000000-3333-0000-0000-000000000005', '00000000-1111-0000-0000-000000000002',
   'Diástasis abdominal', 'Posparto, 18 meses');

insert into public.athlete_injuries (athlete_id, tenant_id, body_region, description, status)
values
  ('00000000-3333-0000-0000-000000000004', '00000000-1111-0000-0000-000000000001',
   'Lumbar', 'Molestia recurrente en peso muerto pesado', 'cronica'),
  ('00000000-3333-0000-0000-000000000003', '00000000-1111-0000-0000-000000000001',
   'Rodilla', 'Condromalacia derecha, diagnosticada en 2024', 'activa');
