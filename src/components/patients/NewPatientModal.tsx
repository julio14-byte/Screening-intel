"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import type { NewPatientInput } from "@/hooks/usePatients";
import type { Gender } from "@/lib/types";

const EMPTY: NewPatientInput = {
  first_name: "",
  last_name: "",
  birth_date: "",
  gender: "female",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onCreate(form);
      setForm(EMPTY);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title="Nuevo paciente" onClose={onClose}>
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
            label="Fecha de nacimiento"
            type="date"
            required
            value={form.birth_date}
            onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
          />
          <SelectInput
            label="Sexo"
            value={form.gender}
            onChange={(e) =>
              setForm({ ...form, gender: e.target.value as Gender })
            }
          >
            <option value="female">Femenino</option>
            <option value="male">Masculino</option>
            <option value="other">Otro</option>
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
