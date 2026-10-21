"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import type { NewPatientInput } from "@/hooks/usePatients";
import { toErrorMessage } from "@/lib/errors";
import {
  ETHNICITY_LABEL,
  ETHNICITY_VALUES,
  type Ethnicity,
} from "@/lib/profile/demographics";
import type { Gender } from "@/lib/types";
import { calculateAge } from "@/lib/utils";

const EMPTY: NewPatientInput = {
  first_name: "",
  last_name: "",
  birth_date: "",
  gender: "female",
  phone: "",
  email: "",
  ethnicity: "",
};

export function NewPatientModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewPatientInput) => Promise<void>;
}) {
  const [form, setForm] = useState<NewPatientInput>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const age = useMemo(
    () => (form.birth_date ? calculateAge(form.birth_date) : null),
    [form.birth_date]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onCreate(form);
      setForm(EMPTY);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, "No se pudo crear el paciente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Nuevo paciente" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <ErrorState message={error} /> : null}
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label="Nombre"
            required
            value={form.first_name}
            onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            placeholder="María"
          />
          <TextInput
            label="Apellido"
            required
            value={form.last_name}
            onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            placeholder="González"
          />
          <TextInput
            label="Teléfono"
            type="tel"
            value={form.phone ?? ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+54 11 5555-0101"
          />
          <TextInput
            label="Correo"
            type="email"
            value={form.email ?? ""}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <TextInput
            label="Fecha de nacimiento"
            type="date"
            required
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
            hint={
              age != null && Number.isFinite(age) ? `${age} años` : undefined
            }
          />
          <SelectInput
            label="Sexo biológico"
            value={form.gender}
            onChange={(e) =>
              setForm({ ...form, gender: e.target.value as Gender })
            }
          >
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="other">Otro / no especificado</option>
          </SelectInput>
          <SelectInput
            label="Etnia"
            value={form.ethnicity ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                ethnicity: e.target.value as Ethnicity | "",
              })
            }
          >
            <option value="">Seleccionar…</option>
            {ETHNICITY_VALUES.map((item) => (
              <option key={item} value={item}>
                {ETHNICITY_LABEL[item]}
              </option>
            ))}
          </SelectInput>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Crear paciente"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
