import {
  collapseVendorRows,
  digitsSubjectCode,
  isVendorScreeningHeader,
  parseScreeningImportCsv,
  parseVendorDate,
  parseVendorGender,
  parseVendorScreeningCsv,
} from "../src/lib/import/vendorScreeningCsv";
import { parseCsvTable } from "../src/lib/import/csvTable";
import { parsePatientCsv } from "../src/lib/import/parsePatientCsv";

let failed = 0;

function assert(condition: unknown, message: string) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

const vendor = parseVendorScreeningCsv(`USUBJID,BRTHDTC,SEX,MHTERM,CMTRT,LBTESTCD,LBSTRESN
10001,1962-04-12,F,diabetes tipo 2,metformina,GLUC,145
10001,1962-04-12,F,hipertensión,enalapril,HBA1C,7.8
10002,1975-09-30,M,diabetes tipo 2,metformina,GLUC,190
`);
assert(vendor.length === 2, "agrupa por sujeto");
assert(vendor[0].subject_code === "10001", "código numérico");
assert(vendor[0].gender === "female", "SEX F");
assert(vendor[0].conditions.includes("diabetes tipo 2"), "MHTERM");
assert(vendor[0].conditions.includes("hipertensión"), "segundo MH");
assert(vendor[0].medications.includes("metformina"), "CMTRT");
assert(vendor[0].laboratories.glucosa === 145, "GLUC → glucosa");
assert(vendor[0].laboratories.hba1c === 7.8, "HBA1C");
assert(vendor[1].laboratories.glucosa === 190, "segundo sujeto");

const skippedPro = collapseVendorRows([
  {
    usubjid: "10003",
    brthdtc: "1980-01-01",
    sex: "M",
    lbtestcd: "QSSCORE",
    lbstresn: "12",
    mhterm: "asma",
  },
]);
assert(skippedPro[0].laboratories.qsscore === undefined, "no mete ePRO al matcher");
assert(skippedPro[0].conditions.includes("asma"), "conserva MH en la misma fila");

assert(parseVendorDate("12/04/1962") === "1962-04-12", "fecha LATAM");
assert(parseVendorDate("19620412") === "1962-04-12", "fecha SDTM compacta");
assert(parseVendorGender("2") === "female", "SEX 2");
assert(digitsSubjectCode("GLP1-SITE-10001") === "10001", "USUBJID con prefijo");
assert(
  isVendorScreeningHeader(["usubjid", "brthdtc", "mhterm"]),
  "detecta EDC"
);
assert(
  !isVendorScreeningHeader(["first_name", "last_name", "birth_date", "gender"]),
  "no confunde plantilla Crisvia"
);

const table = parseCsvTable(`USUBJID;BRTHDTC;SEX;MHTERM
10009;1988-02-02;M;diabetes tipo 2`);
assert(table.headers.includes("usubjid"), "punto y coma Excel");

const crisvia = parseScreeningImportCsv(
  "first_name,last_name,birth_date,gender,subject_code\nAna,Test,1990-01-01,female,10009"
);
assert(crisvia[0].first_name === "Ana", "sigue la plantilla Crisvia");
assert(parsePatientCsv("first_name,last_name,birth_date,gender\nA,B,1990-01-01,female")[0].first_name === "A", "parser clásico intacto");

assert(
  !parseVendorScreeningCsv.toString().includes("Clinical Ink API"),
  "no inventa API Clinical Ink"
);

if (failed) process.exit(1);
console.log("verify-vendor-import: CSV EDC → screening (DM/MH/CM/LB) OK");
