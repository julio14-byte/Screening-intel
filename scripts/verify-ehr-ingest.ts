import {
  parseEhrCsv,
  parseEhrIngestText,
  parseLabPairs,
} from "../src/lib/ehr/parseEhrIngest";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const csv = parseEhrCsv(`ehr_patient_id,first_name,last_name,birth_date,gender,conditions,medications,glucosa
EHR-1,Ana,Pérez,1960-01-02,female,diabetes,metformina,140`);
assert(csv.length === 1, "CSV parsea una fila");
assert(csv[0].ehr_patient_id === "EHR-1", "CSV guarda ehr_patient_id");
assert(csv[0].laboratories?.glucosa === 140, "CSV lee laboratorio");

const json = parseEhrIngestText(
  JSON.stringify({
    ehr_source: "historia",
    patients: [
      {
        ehr_patient_id: "EHR-2",
        first_name: "Luis",
        last_name: "Ramos",
        birth_date: "1972-05-10",
        gender: "male",
      },
    ],
  })
);
assert(json.ehr_source === "historia", "JSON lee origen");
assert(json.patients[0].last_name === "Ramos", "JSON lee paciente");

const labs = parseLabPairs("glucosa:145, hba1c:7.8");
assert(labs.glucosa === 145 && labs.hba1c === 7.8, "labs clave:valor");

let missingId = false;
try {
  parseEhrCsv(`first_name,last_name,birth_date,gender
Ana,Pérez,1960-01-02,female`);
} catch {
  missingId = true;
}
assert(missingId, "CSV sin ehr_patient_id falla");

if (failed) process.exit(1);
console.log("verify-ehr-ingest: CSV, JSON y labs OK");
