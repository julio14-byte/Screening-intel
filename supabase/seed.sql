-- =============================================================================
-- Datos de ejemplo para demo — Screening Intelligence
-- =============================================================================
-- Opcional. Ejecutar después de 0001_initial_schema.sql.

-- Pacientes
insert into public.patients (id, first_name, last_name, birth_date, gender) values
  ('11111111-1111-1111-1111-111111111101', 'María',    'González',  '1962-04-12', 'female'),
  ('11111111-1111-1111-1111-111111111102', 'Carlos',   'Fernández', '1975-09-30', 'male'),
  ('11111111-1111-1111-1111-111111111103', 'Lucía',    'Martínez',  '1988-01-22', 'female'),
  ('11111111-1111-1111-1111-111111111104', 'Jorge',    'Pereyra',   '1954-11-03', 'male'),
  ('11111111-1111-1111-1111-111111111105', 'Ana',      'Suárez',    '1970-06-17', 'female'),
  ('11111111-1111-1111-1111-111111111106', 'Ricardo',  'López',     '1948-02-08', 'male'),
  ('11111111-1111-1111-1111-111111111107', 'Valentina','Ríos',      '1995-08-25', 'female'),
  ('11111111-1111-1111-1111-111111111108', 'Héctor',   'Domínguez', '1966-12-01', 'male');

-- Perfiles clínicos
insert into public.clinical_profiles (patient_id, conditions, medications, laboratories) values
  ('11111111-1111-1111-1111-111111111101',
   array['diabetes tipo 2', 'hipertensión'],
   array['metformina', 'enalapril'],
   '{"glucosa": 145, "hba1c": 7.8, "creatinina": 0.9}'),
  ('11111111-1111-1111-1111-111111111102',
   array['diabetes tipo 2'],
   array['metformina', 'insulina'],
   '{"glucosa": 190, "hba1c": 9.1, "creatinina": 1.1}'),
  ('11111111-1111-1111-1111-111111111103',
   array['asma'],
   array['salbutamol'],
   '{"glucosa": 92}'),
  ('11111111-1111-1111-1111-111111111104',
   array['hipertensión', 'insuficiencia renal'],
   array['losartán', 'furosemida'],
   '{"creatinina": 2.4, "glucosa": 118}'),
  ('11111111-1111-1111-1111-111111111105',
   array['diabetes tipo 2', 'obesidad'],
   array['metformina'],
   '{"hba1c": 8.2}'),
  ('11111111-1111-1111-1111-111111111106',
   array['epoc', 'hipertensión'],
   array['tiotropio', 'amlodipina'],
   '{"glucosa": 101, "creatinina": 1.3}'),
  ('11111111-1111-1111-1111-111111111107',
   array['migraña'],
   array['ibuprofeno'],
   '{}');
-- El paciente 108 queda sin perfil clínico a propósito (caso "Pendiente").

-- Protocolos
insert into public.protocols (id, title, code_name, inclusion_criteria, exclusion_criteria, status) values
  ('22222222-2222-2222-2222-222222222201',
   'Estudio fase III de agonista GLP-1 en diabetes tipo 2 no controlada',
   'GLP1-DM2-301',
   '{
      "min_age": 18, "max_age": 75, "gender": "any",
      "required_conditions": ["diabetes tipo 2"],
      "required_labs": [
        {"name": "hba1c", "min": 7, "max": 10.5, "unit": "%"},
        {"name": "glucosa", "min": 110, "max": 250, "unit": "mg/dL"}
      ]
    }',
   '{
      "excluded_conditions": ["insuficiencia renal"],
      "excluded_medications": ["insulina"]
    }',
   'active'),
  ('22222222-2222-2222-2222-222222222202',
   'Antihipertensivo combinado en hipertensión esencial',
   'HTA-CMB-205',
   '{
      "min_age": 40, "max_age": 80, "gender": "any",
      "required_conditions": ["hipertensión"],
      "required_labs": [
        {"name": "creatinina", "min": 0.5, "max": 1.5, "unit": "mg/dL"}
      ]
    }',
   '{
      "excluded_conditions": ["insuficiencia renal"],
      "excluded_medications": []
    }',
   'active'),
  ('22222222-2222-2222-2222-222222222203',
   'Broncodilatador de acción prolongada en EPOC moderada a severa',
   'EPOC-LAB-112',
   '{
      "min_age": 45, "max_age": 85, "gender": "any",
      "required_conditions": ["epoc"],
      "required_labs": []
    }',
   '{
      "excluded_conditions": ["asma"],
      "excluded_medications": []
    }',
   'active');

-- Screenings iniciales para poblar el tracker
insert into public.screenings (patient_id, protocol_id, status, match_score, match_details) values
  ('11111111-1111-1111-1111-111111111101', '22222222-2222-2222-2222-222222222201', 'screening',      100, '[]'),
  ('11111111-1111-1111-1111-111111111102', '22222222-2222-2222-2222-222222222201', 'screen_failure',  60, '[]'),
  ('11111111-1111-1111-1111-111111111105', '22222222-2222-2222-2222-222222222201', 'pre_screening',   80, '[]'),
  ('11111111-1111-1111-1111-111111111106', '22222222-2222-2222-2222-222222222203', 'randomized',     100, '[]'),
  ('11111111-1111-1111-1111-111111111104', '22222222-2222-2222-2222-222222222202', 'screen_failure',  40, '[]');
