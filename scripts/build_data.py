"""Build site data (processes.json, model.json) from the Process Framework workbook."""
import sys, json, re, collections, os
import openpyxl

src, outdir = sys.argv[1], sys.argv[2]
os.makedirs(outdir, exist_ok=True)
wb = openpyxl.load_workbook(src, read_only=True)

metrics = collections.Counter()
for r in wb["APQC Metrics"].iter_rows(min_row=2, values_only=True):
    if r[1]:
        metrics[str(r[1])] += 1

def clean(v):
    if v is None:
        return ""
    v = str(v).strip()
    return v.replace("DocuSign", "E-Signature Platform")

procs = []
for name in wb.sheetnames:
    if not name[0].isdigit():
        continue
    for r in wb[name].iter_rows(min_row=4, values_only=True):
        if r[1] is None:
            continue
        h = str(r[1])
        procs.append({
            "id": h, "pcf": r[0], "lvl": r[2], "cat": clean(r[3]), "name": clean(r[4]),
            "desc": clean(r[5]), "rel": clean(r[7]), "scope": clean(r[8]), "fn": clean(r[9]),
            "bu": clean(r[10]), "sor": clean(r[11]), "sup": clean(r[12]), "ctl": clean(r[13]),
            "pri": clean(r[14]), "owner": clean(r[16]), "acct": clean(r[17]),
            "status": clean(r[18]) or ("Not Started" if r[8] == "Yes" else ""),
            "mat": clean(r[19]), "kpi": clean(r[20]), "notes": clean(r[21]),
            "metrics": metrics.get(h, 0),
        })

# Decisions from the 3.5 sell-work walkthrough (11/17/2026)
DH, CH = "Derrick Helms (Sales & Marketing)", "Curtis Heroman (Managing Partner, Operations)"
over = {
    "3.5":   dict(owner="Derrick Helms", acct=DH, status="In Review"),
    "3.5.1": dict(owner="Marketing (Lead, Qualified) / Partner (Discovery)", acct=DH, status="In Review",
                  sor="HubSpot", sup=""),
    "3.5.3": dict(owner="Service line owners (Operations)", acct=CH, status="In Review",
                  sor="HaloPSA (quotes)", sup="HubSpot, E-Signature Platform, Avalara"),
    "3.5.4": dict(owner="Experience Owner (XO)", acct=CH, status="In Review", sor="HaloPSA", sup="HubSpot, QuickBooks Online"),
    "3.5.2": dict(owner="Experience Owner (XO)", acct=CH, status="Not Started", notes="Deferred: account planning sits with the XO / Account Management design. Customer master data: Halo owns customers; HubSpot owns marketing, leads and qualification."),
    "5.4":   dict(owner="Practice leads / delivery owners (proposed)", acct=CH, status="Draft"),
    "6.2.2": dict(owner="Service Desk lead (proposed)", acct=CH, status="Draft",
                  notes="System of record for the service desk; APQC 8.7.8 (Operate IT user support) cross-references this process."),
    "9.2.2": dict(owner="AR Clerk (runs invoices); XO / Project Controller (approves)", acct="Finance seat (to confirm)", status="Draft",
                  sor="HaloPSA -> QuickBooks Online", sup="Avalara, Paylocity"),
    "9.2.3": dict(owner="AR, Next Level Now (proposed)", acct="Finance seat (to confirm)", status="Draft"),
    "9.2.4": dict(owner="AR, Next Level Now (proposed)", acct="Finance seat (to confirm)", status="Draft"),
    "3.5.5": dict(owner="Derrick Helms", acct=DH, status="Not Started", notes="Deferred: alliance and channel partners (Microsoft, Pax8, Red River-style subcontracts)."),
}
for p in procs:
    if p["id"] in over:
        p.update(over[p["id"]])

with open(os.path.join(outdir, "processes.json"), "w") as f:
    f.write("[\n" + ",\n".join(json.dumps(p, ensure_ascii=False) for p in procs) + "\n]\n")

systems = []
for r in wb["Systems 2027"].iter_rows(min_row=5, max_row=23, values_only=True):
    name, role, status, note = r[0], r[1], r[2], r[5]
    if name == "DocuSign":
        name, role, note = "E-Signature Platform", "E-signature (moving to Halo e-signature)", "Placeholder name; DocuSign today, Halo's e-signature planned."
    systems.append({"name": name, "role": role, "status": status, "note": note or ""})
json.dump(systems, open(os.path.join(outdir, "systems.json"), "w"), indent=1, ensure_ascii=False)
print(len(procs), "processes;", len(systems), "systems")
