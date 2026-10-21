"use client";

import { SelectInput, TextInput } from "@/components/ui/Field";
import {
  ETHNICITY_LABEL,
  ETHNICITY_VALUES,
  type PatientDemographics,
} from "@/lib/profile/demographics";
import type { Gender } from "@/lib/types";
import { calculateAge } from "@/lib/utils";

export function DemographicsEditor({
  value,
  onChange,
}: {
  value: PatientDemographics;
  onChange: (next: PatientDemographics) => void;
}) {
  const age = value.birth_date ? calculateAge(value.birth_date) : null;
  const ageValid = age != null && Number.isFinite(age) && age >= 0 && age < 130;

  function patch(partial: Partial<PatientDemographics>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-sm font-semibold text-indigo-950">Identificación</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Nombre"
            required
            value={value.first_name}
            onChange={(e) => patch({ first_name: e.target.value })}
            placeholder="María"
          />
          <TextInput
            label="Apellido"
            required
            value={value.last_name}
            onChange={(e) => patch({ last_name: e.target.value })}
            placeholder="González"
          />
          <TextInput
            label="Código de sujeto"
            value={value.subject_code}
            onChange={(e) =>
              patch({ subject_code: e.target.value.replace(/[^\d]/g, "") })
            }
            inputMode="numeric"
            placeholder="10001"
          />
          <TextInput
            label="Teléfono"
            type="tel"
            value={value.phone}
            onChange={(e) => patch({ phone: e.target.value })}
            placeholder="+54 11 5555-0101"
          />
          <TextInput
            label="Correo"
            type="email"
            value={value.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="contacto@correo.com"
          />
          <TextInput
            label="País"
            value={value.address_country}
            onChange={(e) => patch({ address_country: e.target.value })}
            placeholder="MX"
          />
          <div className="sm:col-span-2">
            <TextInput
              label="Domicilio"
              value={value.address_line}
              onChange={(e) => patch({ address_line: e.target.value })}
              placeholder="Calle y número"
            />
          </div>
          <TextInput
            label="Ciudad"
            value={value.address_city}
            onChange={(e) => patch({ address_city: e.target.value })}
          />
          <TextInput
            label="Provincia / estado"
            value={value.address_state}
            onChange={(e) => patch({ address_state: e.target.value })}
          />
          <TextInput
            label="Código postal"
            value={value.address_postal_code}
            onChange={(e) => patch({ address_postal_code: e.target.value })}
          />
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold text-indigo-950">
          Edad y fecha de nacimiento
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="Fecha de nacimiento"
            type="date"
            required
            value={value.birth_date}
            onChange={(e) => patch({ birth_date: e.target.value })}
          />
          <div className="rounded-md border border-violet-100 bg-white px-2.5 py-1.5">
            <p className="text-xs font-medium text-slate-700">Edad actual</p>
            <p className="mt-0.5 text-sm tabular-nums text-indigo-950">
              {ageValid ? `${age} años` : "—"}
            </p>
            <p className="text-[11px] text-slate-400">
              Se recalcula sola a partir de la fecha de nacimiento.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-indigo-950">
          Sexo biológico y etnia
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Sexo biológico"
            value={value.gender}
            onChange={(e) => patch({ gender: e.target.value as Gender })}
          >
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="other">Otro / no especificado</option>
          </SelectInput>
          <SelectInput
            label="Etnia"
            value={value.ethnicity}
            onChange={(e) => patch({ ethnicity: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {ETHNICITY_VALUES.map((item) => (
              <option key={item} value={item}>
                {ETHNICITY_LABEL[item]}
              </option>
            ))}
          </SelectInput>
        </div>
      </section>
    </div>
  );
}
