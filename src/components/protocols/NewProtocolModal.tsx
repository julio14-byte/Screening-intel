"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SelectInput, TextInput } from "@/components/ui/Field";
import { ErrorState } from "@/components/ui/StateMessage";
import { TagListEditor } from "@/components/profile/TagListEditor";
import { LabCriteriaEditor } from "@/components/protocols/LabCriteriaEditor";
import type { ExtractedProtocolDraft } from "@/lib/protocols/extractCriteria";
import { ProtocolPdfImport } from "@/components/protocols/ProtocolPdfImport";
import type { NewProtocolInput } from "@/hooks/useProtocols";
import type { LabCriterion } from "@/lib/types";

export function NewProtocolModal({
  open,
  onClose,
  onCreate,
  prefill,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: NewProtocolInput) => Promise<void>;
  prefill?: ExtractedProtocolDraft | null;
}) {
  const [title, setTitle] = useState("");
  const [codeName, setCodeName] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [gender, setGender] = useState<"any" | "male" | "female">("any");
  const [requiredConditions, setRequiredConditions] = useState<string[]>([]);
  const [requiredLabs, setRequiredLabs] = useState<LabCriterion[]>([]);
  const [excludedConditions, setExcludedConditions] = useState<string[]>([]);
  const [excludedMedications, setExcludedMedications] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setTitle("");
    setCodeName("");
    setMinAge("");
    setMaxAge("");
    setGender("any");
    setRequiredConditions([]);
    setRequiredLabs([]);
    setExcludedConditions([]);
    setExcludedMedications([]);
  };

  function applyDraft(draft: ExtractedProtocolDraft) {
    setTitle(draft.title);
    setCodeName(draft.code_name);
    setMinAge(draft.inclusion_criteria.min_age?.toString() ?? "");
    setMaxAge(draft.inclusion_criteria.max_age?.toString() ?? "");
    setGender(draft.inclusion_criteria.gender ?? "any");
    setRequiredConditions(draft.inclusion_criteria.required_conditions ?? []);
    setRequiredLabs(draft.inclusion_criteria.required_labs ?? []);
    setExcludedConditions(draft.exclusion_criteria.excluded_conditions ?? []);
    setExcludedMedications(draft.exclusion_criteria.excluded_medications ?? []);
  }

  useEffect(() => {
    if (open && prefill) applyDraft(prefill);
  }, [open, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onCreate({
        title: title.trim(),
        code_name: codeName.trim(),
        status: "active",
        inclusion_criteria: {
          min_age: minAge.trim() === "" ? null : Number(minAge),
          max_age: maxAge.trim() === "" ? null : Number(maxAge),
          gender,
          required_conditions: requiredConditions,
          required_labs: requiredLabs,
        },
        exclusion_criteria: {
          excluded_conditions: excludedConditions,
          excluded_medications: excludedMedications,
        },
      });
      reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo crear el protocolo"
      );
    } finally {
      setSaving(false);
    }
  };

  const sectionTitle = "text-xs font-semibold uppercase tracking-wide";

  return (
    <Modal open={open} title="Nuevo protocolo de estudio" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <ProtocolPdfImport onExtracted={applyDraft} />

        {error ? <ErrorState message={error} /> : null}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <TextInput
              label="Título del estudio"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Estudio fase III de…"
            />
          </div>
          <TextInput
            label="Código"
            required
            value={codeName}
            onChange={(e) => setCodeName(e.target.value)}
            placeholder="GLP1-DM2-301"
          />
        </div>

        <fieldset className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50/40 p-3">
          <legend className={`${sectionTitle} px-1 text-emerald-700`}>
            Criterios de inclusión
          </legend>
          <div className="grid grid-cols-3 gap-3">
            <TextInput
              label="Edad mínima"
              type="number"
              min={0}
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              placeholder="18"
            />
            <TextInput
              label="Edad máxima"
              type="number"
              min={0}
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              placeholder="75"
            />
            <SelectInput
              label="Sexo requerido"
              value={gender}
              onChange={(e) =>
                setGender(e.target.value as "any" | "male" | "female")
              }
            >
              <option value="any">Cualquiera</option>
              <option value="female">Femenino</option>
              <option value="male">Masculino</option>
            </SelectInput>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">
              Condiciones requeridas
            </p>
            <TagListEditor
              label="condiciones requeridas"
              items={requiredConditions}
              onChange={setRequiredConditions}
              placeholder="ej: diabetes tipo 2"
              emptyText="Sin condiciones requeridas."
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">
              Laboratorios requeridos (rango)
            </p>
            <LabCriteriaEditor labs={requiredLabs} onChange={setRequiredLabs} />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-md border border-rose-200 bg-rose-50/40 p-3">
          <legend className={`${sectionTitle} px-1 text-rose-700`}>
            Criterios de exclusión
          </legend>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">
              Condiciones prohibidas
            </p>
            <TagListEditor
              label="condiciones prohibidas"
              items={excludedConditions}
              onChange={setExcludedConditions}
              placeholder="ej: insuficiencia renal"
              emptyText="Sin condiciones excluyentes."
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-700">
              Medicamentos prohibidos
            </p>
            <TagListEditor
              label="medicamentos prohibidos"
              items={excludedMedications}
              onChange={setExcludedMedications}
              placeholder="ej: insulina"
              emptyText="Sin medicación excluyente."
            />
          </div>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Crear protocolo"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
