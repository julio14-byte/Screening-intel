"use client";

import { Shield } from "lucide-react";
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
      <p className="flex gap-2 rounded-md border border-violet-100 bg-violet-50/70 px-3 py-2 text-xs text-indigo-800">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-600" aria-hidden />
        <span>
          Nombre y contacto se guardan bajo estricta confidencialidad en el
          expediente del centro. En el estudio el paciente se identifica con el{" "}
          <strong>código numérico de sujeto</strong>, no con sus datos personales.
        </span>
      </p>

      <section>
        <h3 className="text-sm font-semibold text-indigo-950">Identificación</h3>
        <p className="mb-3 text-xs text-slate-500">
          Datos de contacto del participante. Quedan disociados del protocolo
          mediante el código de sujeto.
        </p>
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
            hint={
              value.subject_code
                ? "Identificador numérico en el estudio. No es el nombre."
                : "Si lo dejás vacío, se asigna un número automático al crear el paciente."
            }
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
        <h3 className="text-sm font-semibold text-indigo-950">
          Edad y fecha de nacimiento
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Sirve para verificar que está en el rango de edad permitido del
          protocolo. El matching usa la edad calculada, no un campo aparte.
        </p>
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
        <p className="mb-3 text-xs text-slate-500">
          Algunos medicamentos actúan de forma distinta según estas variables.
          El matching usa el sexo biológico; la etnia queda registrada en el
          expediente.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectInput
            label="Sexo biológico"
            value={value.gender}
            onChange={(e) => patch({ gender: e.target.value as Gender })}
            hint="No es identidad de género: es la variable que usa el protocolo y la farmacología."
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
