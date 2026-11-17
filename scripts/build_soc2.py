"""Build site/data/soc2.json from the SOC 2 Master Control Matrix (Word document).

Usage: python scripts/build_soc2.py <Master_Control_Matrix.docx> site/data

Reads every control table in the matrix. The Readiness column is deliberately
ignored: readiness/status is in flux and is not published on the site.
PROC maps each control to the library processes it supports; edit it here (not
in the JSON) so a re-import of a newer matrix keeps the mapping.
"""
import sys, os, json, re
import docx

src, outdir = sys.argv[1], sys.argv[2]
d = docx.Document(src)

# Domain scope for the current engagement (from the matrix's control count summary).
DOMAINS = [
    ("CC1", "Control Environment", True), ("CC2", "Communication and Information", True),
    ("CC3", "Risk Assessment", True), ("CC4", "Monitoring Activities", True),
    ("CC5", "Control Activities", True), ("CC6", "Logical and Physical Access", True),
    ("CC7", "System Operations", True), ("CC8", "Change Management", True),
    ("CC9", "Risk Mitigation", True), ("A1", "Availability", False),
    ("PI1", "Processing Integrity", False), ("C1", "Confidentiality", False),
    ("P", "Privacy", False),
]

# Control -> library processes it supports (APQC ids that exist in processes.json).
PROC = {
    "CM-CC1.1-01": ["12.4.1", "7.3.1"], "CM-CC1.1-02": ["12.4.1", "7.4.4"],
    "CM-CC1.2-01": ["12.3", "12.3.2"], "CM-CC1.3-01": ["1.2.5"], "CM-CC1.3-02": ["7.1.4", "7.2.1"],
    "CM-CC1.4-01": ["7.2.3"], "CM-CC1.4-02": ["7.3.4"], "CM-CC1.4-03": ["7.3.4", "7.3.3"],
    "CM-CC1.5-01": ["7.3.2"],
    "CM-CC2.1-01": ["8.3.3", "13.7.3"], "CM-CC2.1-02": ["13.6.5", "13.5.3"], "CM-CC2.2-01": ["7.8.3", "11.2.1"],
    "CM-CC2.2-02": ["8.3.3"], "CM-CC2.3-01": ["8.3.3", "12.3.2"], "CM-CC2.3-02": ["3.5.3", "12.4.9"],
    "CM-CC3.1-01": ["1.2.6", "8.3.1"], "CM-CC3.2-01": ["11.1.2", "8.3.3"], "CM-CC3.2-02": ["8.3.3"],
    "CM-CC3.3-01": ["11.1.3"], "CM-CC3.4-01": ["11.1.2", "8.3.1"],
    "CM-CC4.1-01": ["8.3.3"], "CM-CC4.1-02": ["8.3.6"], "CM-CC4.2-01": ["11.3.1", "8.3.6"],
    "CM-CC5.1-01": ["11.1.2"], "CM-CC5.2-01": ["8.3.3"], "CM-CC5.3-01": ["11.2.1", "8.3.5"],
    "CM-CC6.1-01": ["8.2.3", "8.3.5"], "CM-CC6.1-02": ["8.3.8"], "CM-CC6.1-03": ["10.3", "8.7.7"],
    "CM-CC6.2-01": ["8.3.8", "7.3.1"], "CM-CC6.3-01": ["7.6.2", "7.6.1", "8.3.8"], "CM-CC6.4-01": ["10.1.4"],
    "CM-CC6.5-01": ["10.4.2"], "CM-CC6.6-01": ["8.3.5"], "CM-CC6.7-01": ["8.3.5"], "CM-CC6.8-01": ["8.3.5", "8.7.7"],
    "CM-CC7.1-01": ["8.3.3", "8.3.6"], "CM-CC7.1-02": ["8.7.7"], "CM-CC7.2-01": ["8.3.3"],
    "CM-CC7.2-02": ["6.2.2", "8.7.5.9"], "CM-CC7.3-01": ["8.7.5.9", "6.2.2"], "CM-CC7.4-01": ["11.3", "8.3.3"],
    "CM-CC7.4-02": ["11.4.3"], "CM-CC7.5-01": ["8.3.7", "11.3"],
    "CM-CC8.1-01": ["8.6.3"], "CM-CC8.1-02": ["8.5.4"], "CM-CC8.1-03": ["8.6.3"],
    "CM-CC9.1-01": ["11.4.2", "8.3.4"], "CM-CC9.1-02": ["8.3.7"], "CM-CC9.2-01": ["4.2.3.2", "4.2.5"],
    "CM-CC9.2-02": ["4.2.5.1", "4.2.3.2"],
    "CM-A1.1-01": ["8.7.4"], "CM-A1.1-02": ["8.1.5", "6.2.2"], "CM-A1.2-01": ["8.3.7"],
    "CM-A1.2-02": ["10.1.4"], "CM-A1.3-01": ["11.4.3", "8.3.7"],
    "CM-PI1.1-01": ["8.5.4"], "CM-PI1.2-01": ["8.5.4"], "CM-PI1.3-01": ["8.7.6", "9.2.2"],
    "CM-PI1.4-01": ["8.7.6"], "CM-PI1.5-01": ["8.7.5.9", "8.7.6"],
    "CM-C1.1-01": ["8.4.3", "13.6.3"], "CM-C1.1-02": ["8.3.5"], "CM-C1.2-01": ["8.4.3", "10.4.2"],
    "CM-P1.1-01": ["8.3.5"], "CM-P1.2-01": ["8.3.5"], "CM-P2.1-01": ["8.3.5"], "CM-P3.1-01": ["8.3.5"],
    "CM-P3.2-01": ["8.4.3"], "CM-P4.1-01": ["8.3.5", "4.2.5"], "CM-P4.2-01": ["12.4.9", "4.2.3.3"],
    "CM-P4.3-01": ["12.4.9"], "CM-P5.1-01": ["8.3.5"], "CM-P5.2-01": ["8.3.5"], "CM-P6.1-01": ["8.3.6"],
    "CM-P6.2-01": ["8.3.5", "11.3"], "CM-P6.3-01": ["6.2.5", "11.2.2"], "CM-P6.4-01": ["8.3.5"],
    "CM-P6.5-01": ["8.3.5"], "CM-P6.6-01": ["7.3.4"], "CM-P6.7-01": ["8.3.5"], "CM-P7.1-01": ["8.3.5"],
    "CM-P8.1-01": ["8.3.5"],
}

TYPES = {"Prev": "Preventive", "Det": "Detective", "Corr": "Corrective"}

def domain_of(tsc):
    for code, name, scope in DOMAINS:
        if code == "P" and re.match(r"P\d", tsc):
            return code
        if tsc.startswith(code + "."):
            return code
    raise ValueError(tsc)

def refs(s):
    return [x.strip() for x in s.split(",") if x.strip()]

controls = []
for t in d.tables:
    hdr = [c.text.strip() for c in t.rows[0].cells]
    if not hdr or hdr[0] != "Control ID":
        continue
    for r in t.rows[1:]:
        row = dict(zip(hdr, [c.text.strip() for c in r.cells]))
        cid = row["Control ID"]
        controls.append({
            "id": cid, "tsc": row["TSC Ref"], "domain": domain_of(row["TSC Ref"]),
            "objective": row["Control Objective"], "activity": row["Control Activity"],
            "type": " / ".join(TYPES.get(x, x) for x in row["Type"].split("/")),
            "freq": row["Freq"], "owner": row["Owner"],
            "evidence": refs(row["Evidence (EVD-)"]), "interview": refs(row["Interview (INT-)"]),
            "test": refs(row["Test (TP-)"]), "design": row["Type 1: Design"], "operating": row["Type 2: Op. Eff."],
            "processes": PROC.get(cid, []),
        })

procs = {p["id"] for p in json.load(open(os.path.join(outdir, "processes.json")))}
bad = [(c["id"], p) for c in controls for p in c["processes"] if p not in procs]
if bad:
    sys.exit("Unknown process ids in PROC: %s" % bad)
unmapped = [c["id"] for c in controls if not c["processes"]]

out = {
    "source": "SOC 2 Master Control Matrix (Mock Audit Program, Deliverable #3)",
    "domains": [{"code": c, "name": n, "inScope": s} for c, n, s in DOMAINS],
    "controls": controls,
}
with open(os.path.join(outdir, "soc2.json"), "w") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)
    f.write("\n")
print(len(controls), "SOC 2 controls;", sum(1 for c in controls if c["processes"]), "mapped;", "unmapped:", unmapped or "none")
