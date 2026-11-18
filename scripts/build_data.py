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
    v = str(v).replace("\ufffd", " ").strip()  # APQC source text has a few garbled spaces
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

# Decisions from the 3.5 Sales walkthrough (11/17/2026)
DH, CH = "Derrick Helms (Sales & Marketing)", "Curtis Heroman (Managing Partner, Operations)"
over = {
    "3.5":   dict(owner="Derrick Helms", acct=DH, status="In Review"),
    "3.5.1": dict(owner="Marketing (Lead, Qualified) / Partner (Discovery)", acct=DH, status="In Review",
                  sor="HubSpot", sup=""),
    "3.5.3": dict(owner="Service line owners (Operations)", acct=CH, status="In Review",
                  sor="HaloPSA (quotes)", sup="HubSpot, E-Signature Platform, Avalara"),
    "3.5.4": dict(owner="Experience Owner (XO)", acct=CH, status="In Review", sor="HaloPSA", sup="HubSpot, QuickBooks Online"),
    "3.5.2": dict(owner="Experience Owner (XO)", acct=CH, status="Not Started", notes="Deferred: account planning sits with the XO / Account Management design. Customer master data: Halo owns customers; HubSpot owns marketing, leads and qualification."),
    "5.4":   dict(owner="Practice leads / delivery owners", acct=CH, status="In Review"),
    "6.2.2": dict(owner="Managed Technology (managed clients); Service Desk practice (enterprise Tier 1)", acct=CH, status="In Review",
                  notes="System of record for the service desk; APQC 8.7.8 (Operate IT user support) cross-references this process."),
    "9.2.2": dict(owner="AR Clerk (runs invoices); XO / Project Controller (approves)", acct="Finance seat (to confirm)", status="In Review",
                  sor="HaloPSA -> QuickBooks Online", sup="Avalara, Paylocity, Pax8"),
    "9.2.3": dict(owner="AR, Next Level Now", acct="Finance seat (to confirm)", status="In Review"),
    "9.2.4": dict(owner="AR, Next Level Now", acct="Finance seat (to confirm)", status="In Review"),
    "3.5.5": dict(owner="Derrick Helms", acct=DH, status="Not Started", notes="Deferred: alliance and channel partners (Microsoft, Pax8, Red River-style subcontracts)."),
}
for p in procs:
    if p["id"] in over:
        p.update(over[p["id"]])

# Policies (Trust Center summaries, 11/17/2026). POL names each policy; POLICY_OWNERS sets owners
# and the governing policy on existing APQC processes; EXTRA adds Sparkhound-specific processes
# the policies require but APQC does not break out. EXTRA ids carry an "S" (e.g. 4.2.3.S1) and sit
# under the closest APQC parent. Never insert rows into the workbook's category tabs for these.
POL = {
    "bn": "Breach Notification Policy", "bc": "Business Continuity and Disaster Recovery Plan",
    "cm": "Change Management Policy", "en": "Encryption Policy", "es": "Escalation and Notification Procedures",
    "ir": "Incident Response Management Policy", "dr": "Data Recovery Policy", "vm": "Vendor Management Policy",
    "vu": "Vulnerability Management Policy",
}
POLICY_OWNERS = {
    "8.3.5":   dict(owner="Centralized Services", pol=["en", "vu"]),
    "8.3.8.6": dict(owner="Managed Services (incident response lead)", pol=["ir", "bn"]),
    "8.6.3":   dict(owner="Internal Change Board / Client Change Board", pol=["cm"]),
    "8.7.6.8": dict(owner="Director of Managed Services (DR Coordinator)", pol=["dr", "bc"]),
    "11.4":    dict(owner="Managing Partner, Operations (Executive Sponsor); Director of Managed Services (DR Coordinator)", pol=["bc"]),
    "4.2.3":   dict(owner="IT leadership", pol=["vm"]),
    "4.2.5":   dict(owner="IT leadership", pol=["vm"]),
    "6.2.2":   dict(pol=["es"]),
}
EXTRA = [
    # Client service escalations
    dict(id="6.2.2.S1", name="Escalate client service issues by severity", pol=["es"], owner="XO / Customer Success Manager (Tier 1)", sor="HaloPSA",
         desc="Classify and log the issue, acknowledge the client within the severity target (Critical 30 minutes, High 1 business hour, Medium 1 business day, Low 2 business days), send status updates on the severity cadence, and raise unresolved escalations to the next tier: the XO (called Customer Success Manager in the policy), then the Director of Managed Services or Digital Transformation, then the Partner, then the Managing Partner over Operations (the policy's Managing Director)."),
    dict(id="6.2.2.S2", name="Attest to escalation roles", pol=["es"], owner="Customer Success Director", sor="",
         desc="Everyone in the escalation chain attests to the procedure on taking the role and at least annually."),
    # Security incident response and breach notification
    dict(id="8.3.8.6.S1", name="Report and triage suspected security incidents", pol=["ir"], owner="Incident response lead", sor="HaloPSA", sup="Arctic Wolf, CrowdStrike",
         desc="Anyone who suspects an incident reports it immediately, without investigating first, through the 24/7 monitored channel. The report is triaged, given a severity, and evidence preservation starts before containment."),
    dict(id="8.3.8.6.S2", name="Contain the incident and preserve evidence", pol=["ir"], owner="Incident response lead", sor="",
         desc="Isolate affected systems and preserve logs, forensic images and system state under chain of custody."),
    dict(id="8.3.8.6.S3", name="Notify the cyber liability carrier before eradication", pol=["ir"], owner="Incident response lead", sor="",
         desc="Mandatory checkpoint: the carrier is notified, and carrier-approved forensic and legal resources engaged, before any eradication work changes evidence or system state."),
    dict(id="8.3.8.6.S4", name="Eradicate the threat and recover systems", pol=["ir"], owner="Response engineers", sor="",
         desc="Remove the threat, close the exploited weakness, restore systems, and monitor closely for recurrence."),
    dict(id="8.3.8.6.S5", name="Determine breach notification obligations", pol=["bn", "ir"], owner="Legal counsel with Compliance", sor="",
         desc="Legal counsel and compliance decide whether a breach must be notified, to whom, and on what timeline, from the data involved, the applicable law (state law, HIPAA, GDPR, DFARS) and client contracts."),
    dict(id="8.3.8.6.S6", name="Notify affected clients, individuals and regulators", pol=["bn", "ir"], owner="Executive leadership; Compliance", sor="",
         desc="Notify without undue delay once a breach is confirmed, within the client agreement and statutory timelines, with a single coordinated account when a vendor is involved, and give clients the facts they need for their own obligations."),
    dict(id="8.3.8.6.S7", name="Conduct post-incident reviews", pol=["ir"], owner="Incident response lead", sor="",
         desc="After every incident: document root cause, assign and track corrective actions, update procedures. Incident records are kept at least six years."),
    dict(id="8.3.8.6.S8", name="Exercise the incident response program", pol=["ir"], owner="Incident response lead", sor="",
         desc="Run a tabletop exercise at least annually and verify the escalation contact directory quarterly."),
    # Vulnerability management and encryption
    dict(id="8.3.5.S1", name="Scan for and prioritize vulnerabilities", pol=["vu"], owner="Centralized Services", sor="Arctic Wolf", sup="CrowdStrike, NinjaOne",
         desc="Scan internal and internet-facing assets continuously and rate findings by CVSS, weighted for internet exposure and active exploits."),
    dict(id="8.3.5.S2", name="Deploy patches", pol=["vu"], owner="Centralized Services", sor="RMM", sup="",
         desc="Patch operating systems and third-party applications monthly through NinjaOne in maintenance windows, piloting first where feasible; patch critical and actively exploited vulnerabilities out of cycle as soon as a validated patch exists."),
    dict(id="8.3.5.S3", name="Track remediation against targets and approve exceptions", pol=["vu"], owner="Centralized Services", sor="",
         desc="Track remediation against the targets (Critical within days, 24 to 48 hours if exploited or internet-facing; High 30 days; Medium 90 days; Low routine) and approve time-bound exceptions with compensating controls."),
    dict(id="8.3.5.S4", name="Enforce encryption standards", pol=["en"], owner="Centralized Services", sor="RMM", sup="M365 / Entra ID",
         desc="AES-256 on every laptop and desktop before issue, MDM with encryption on mobile devices, TLS 1.2+ in transit, AES-256 at rest for sensitive data and backups; exceptions need documented approval and a compensating control."),
    dict(id="8.3.5.S5", name="Respond to lost or stolen devices", pol=["en"], owner="Centralized Services", sor="HaloPSA",
         desc="A lost or stolen device is reported and acted on within 24 hours."),
    # Change management
    dict(id="8.6.3.S1", name="Submit and review change requests at the Change Board", pol=["cm"], owner="Requestor; Internal or Client Change Board", sor="HaloPSA (change mgmt)",
         desc="Normal changes need a complete change request (type, people, dates, description, justification, impact, test, back-out and communication plans) reviewed by the Internal Change Board (Sparkhound systems) or Client Change Board (client production) and approved by majority vote with quorum."),
    dict(id="8.6.3.S2", name="Maintain pre-approved standard changes", pol=["cm"], owner="Internal and Client Change Boards", sor="HaloPSA (change mgmt)",
         desc="The Boards approve the procedures for low-risk, repeatable standard changes, which are then logged without an individual vote."),
    dict(id="8.6.3.S3", name="Approve and ratify emergency changes", pol=["cm"], owner="Change Board voting member", sor="HaloPSA (change mgmt)",
         desc="One voting member signs off an emergency change; elevated access is time-limited and logged; the full Board ratifies within two business days."),
    dict(id="8.6.3.S4", name="Validate implemented changes and roll back failures", pol=["cm"], owner="Requestor / implementer", sor="HaloPSA (change mgmt)",
         desc="Confirm the change worked and introduced no vulnerability or outage; follow the back-out plan if it did; update baselines when a change becomes a standard."),
    dict(id="8.6.3.S5", name="Review change logs quarterly", pol=["cm"], owner="Change Management Policy owner", sor="HaloPSA (change mgmt)",
         desc="Quarterly review of change records for completeness and adherence; records kept at least one year, longer where a client contract requires."),
    # Data recovery and business continuity
    dict(id="8.7.6.8.S1", name="Monitor backup jobs and investigate failures", pol=["dr", "bc"], owner="Centralized Services (Technical Recovery Lead)", sor="",
         desc="Independent, encrypted, immutable backups of Sparkhound SaaS data run on a 24-hour cycle; failed jobs are investigated within one business day. Retention is 90 days point-in-time plus 12 monthly archives.",
         notes="Decision 11/18/2026: backups run every 24 hours for all tiers (24-hour RPO), per the Data Recovery Policy. The BC/DR plan's 1-hour Tier 0 RPO needs updating to match."),
    dict(id="8.7.6.8.S2", name="Test restores quarterly", pol=["dr", "bc"], owner="Director of Managed Services (DR Coordinator)", sor="",
         desc="Restore a sample of mailboxes, files, sites and service management records to a test location each quarter and record completeness and restore time."),
    dict(id="8.7.6.8.S3", name="Restore systems in recovery-tier order", pol=["dr", "bc"], owner="Centralized Services (Technical Recovery Lead)", sor="",
         desc="Restore Tier 0 (identity, email, service management; RTO 4h) first, then Tier 1 (finance, documents, RMM; 24h), Tier 2 (CRM, e-signature, marketing; 72h) and Tier 3 (120h), validating integrity before return to use. Recovery point is 24 hours for every tier."),
    dict(id="11.4.2.S1", name="Conduct business impact analysis and set recovery tiers", pol=["bc"], owner="Director of Managed Services (DR Coordinator) with department leaders", sor="SharePoint",
         desc="Department leaders' BIA sets each system's recovery tier and each critical function's maximum tolerable downtime and alternate processing; reviewed at least annually."),
    dict(id="11.4.4.S1", name="Declare a disaster and activate the response team", pol=["bc"], owner="Managing Partner, Operations (Executive Sponsor); Incident Commander", sor="",
         desc="Assess a reported event within 30 minutes, declare against defined criteria, notify all employees within one hour and affected clients within four hours, with external statements approved by the Executive Sponsor."),
    dict(id="11.4.4.S2", name="Account for personnel after a facility or regional event", pol=["bc"], owner="People and HR Lead", sor="Paylocity",
         desc="HR runs a personnel accountability check within four hours of a facility or regional event such as a hurricane."),
    dict(id="11.4.3.S1", name="Run the continuity test calendar", pol=["bc", "dr"], owner="Director of Managed Services (DR Coordinator)", sor="",
         desc="Annual tabletop, emergency access test, unannounced communication tree test (90% acknowledge within two hours) and runbook walkthrough for each critical system; results and corrective actions retained."),
    dict(id="11.4.4.S3", name="Hold post-event reviews", pol=["bc"], owner="Director of Managed Services (DR Coordinator)", sor="",
         desc="Formal review within ten business days of stand-down, with corrective actions owned, dated and tracked to closure."),
    # Vendor management
    dict(id="4.2.3.S1", name="Assign vendor risk tiers", pol=["vm"], owner="IT leadership", sor="",
         desc="Tier every vendor Critical, High, Medium or Low by its access to systems and data and how critical its service is; an untiered vendor is treated as Critical."),
    dict(id="4.2.3.S2", name="Perform tier-based vendor due diligence", pol=["vm"], owner="IT leadership; Finance; Legal", sor="",
         desc="Critical and High: audit report (SOC 2 / ISO 27001), security questionnaire, breach history, financial condition, data types, fourth parties, IR/BC/DR documents, legal history. Medium: abbreviated review. No access before diligence is complete."),
    dict(id="4.2.3.S3", name="Include security and notification terms in vendor contracts", pol=["vm"], owner="Legal", sor="E-Signature Platform",
         desc="Critical and High contracts cover SLAs, data protection, audit rights, breach notification, subcontractor responsibility, indemnification and continuity."),
    dict(id="4.2.5.S1", name="Maintain the vendor inventory", pol=["vm"], owner="IT leadership", sor="",
         desc="Every vendor carries a risk tier, a named internal owner and a last-assessed date."),
    dict(id="4.2.5.S2", name="Reassess vendors by tier", pol=["vm"], owner="Vendor's internal owner", sor="",
         desc="Critical and High at least annually or at renewal; Medium every two years or on scope change; includes fourth-party dependencies and monitoring for incidents, financial or ownership change."),
    dict(id="4.2.5.S3", name="Maintain vendor SLAs, escalation contacts and exit strategies", pol=["bc", "dr"], owner="IT leadership", sor="",
         desc="For mission-critical and business-critical platforms: SLAs, support tiers, escalation contacts and status pages verified annually, with a documented exit strategy (export format, migration path, alternate vendor)."),
    dict(id="4.2.5.S4", name="Offboard vendors", pol=["vm"], owner="Vendor's internal owner", sor="",
         desc="Revoke and verify removal of all vendor access; obtain return or documented destruction of data; retain the completion record."),
    dict(id="4.2.5.S5", name="Approve and track vendor policy exceptions", pol=["vm"], owner="Management (by risk tier)", sor="",
         desc="Document the exception, accept residual risk at the right level, set a review date, and review exceptions annually."),
]

# Process review answers (11/18/2026): owners on APQC processes and Sparkhound processes APQC lacks.
REVIEW = "From the Sales, Operations and Finance process review (11/18/2026)."
REVIEW_OVER = {
    "3.4.1": dict(owner="Sales & Marketing leader", acct=DH, notes="Weekly pipeline review and forecast in HubSpot. " + REVIEW),
    "3.3.3": dict(owner="Service line owners", acct=CH, notes="Street prices and floors in the Halo price book are reviewed annually by service line owners and approved by the Managing Partner over Operations. " + REVIEW),
    "5.2":   dict(owner="Practice leads", acct=CH, status="In Review", notes="Practice leads book resources in Halo; conflicts are resolved at the weekly Monday capacity meeting. Utilization is tracked by practice, each with its own target set by its staffing mix. " + REVIEW),
    "9.1.2": dict(owner="CEO with Next Level Now", sor="QuickBooks Online", sup="Excel", notes="CEO owns the annual budget with Next Level Now; monthly leadership reporting comes from QuickBooks Online and spreadsheets. " + REVIEW),
    "9.5.1": dict(owner="Practice leads (timesheets); XO / Project Controller (billable time)", acct=CH, status="In Review", sor="HaloPSA (timesheets)", sup="Paylocity", notes="Weekly time entry by Managed Services and Digital Transformation operations teams. " + REVIEW),
    "9.6.1": dict(owner="Next Level Now", acct="Finance seat (to confirm)", status="In Review", notes="AP inbox to Next Level Now; budget owner approves bills; weekly payment run released by the CEO; call-back check on vendor bank details. " + REVIEW),
    "9.2.5": dict(notes="Approver and dollar threshold for credit memos and SLA credits are not set yet. " + REVIEW),
}
for k, v in REVIEW_OVER.items():
    next(p for p in procs if p["id"] == k).update(v)
EXTRA += [
    dict(id="3.3.3.S1", status="In Review", name="Approve quote pricing and discounts", owner="Service line owners (price and floor); Partner; Managing Partner, Operations", acct=CH, sor="HaloPSA (items / price book)", notes=REVIEW,
         desc="Operations sets each item's street price and floor in the Halo price book. The Partner may discount freely between street price and floor; a discount below the floor needs Managing Partner, Operations approval before the quote goes out."),
    dict(id="3.5.2.S1", name="Hold client account reviews by tier", owner="XO", acct=CH, sor="HaloPSA", notes=REVIEW + " Tiers and review frequencies to define.",
         desc="The XO holds regular account reviews with each client, at a frequency set by the client's tier. Managed services clients have a quarterly QBR that includes the user access review, which sets the next quarter's seat counts."),
    dict(id="3.5.2.S2", name="Manage contract renewals", owner="XO", acct=CH, status="In Review", sor="HaloPSA", notes=REVIEW,
         desc="Managed services agreements auto-renew. The XO owns each renewal and reviews the agreement 90 days before the term ends to re-price or renegotiate."),
    dict(id="5.3.3.S1", name="Process license subscription changes", owner="Managed Technology Tier 2", acct=CH, sor="Pax8", sup="HaloPSA", notes=REVIEW,
         desc="Clients change Microsoft licenses either self-service in their Pax8 portal, which pushes the change to Halo automatically, or by a Halo ticket that Tier 2 processes in Pax8."),
    dict(id="4.2.4.S1", name="Procure hardware and software for clients", owner="XO / Partner", acct=CH, sor="HaloPSA", sup="QuickBooks Online", notes=REVIEW,
         desc="Quote the item in Halo, order it from a distributor, receive and deliver it, then bill it through Halo."),
    dict(id="5.4.1.S1", name="Onboard new managed services clients", owner="XO", acct=CH, status="In Review", sor="HaloPSA (projects)", sup="Hudu, RMM", notes=REVIEW,
         desc="The XO runs Sparkhound's defined onboarding project plan for each new managed services client: discovery, documentation in Hudu, agent deployment and the rest of the plan through go-live."),
    dict(id="5.4.2.S1", name="Review project budget and burn weekly", owner="XO with practice lead", acct=CH, sor="HaloPSA (projects)", notes=REVIEW,
         desc="Each week the XO and practice lead review hours against budget in Halo, separately from the client status report."),
    dict(id="5.4.3.S1", name="Offboard departing clients", owner="XO", acct=CH, sor="HaloPSA (projects)", sup="Hudu, RMM", notes=REVIEW,
         desc="The XO runs an offboarding project: remove agents and Sparkhound access, hand over Hudu documentation and credentials, and send the final invoice."),
    dict(id="9.2.2.S1", name="Set up and maintain recurring agreements", owner="XO", acct=CH, status="In Review", sor="HaloPSA", sup="Pax8, QuickBooks Online", notes=REVIEW,
         desc="Managed services agreements bill monthly in advance from Halo. License lines change monthly via Pax8; seats and services change at the quarterly QBR from the client's user access review, and that rate holds for three months."),
    dict(id="9.3.2.S1", name="Close the month", owner="Next Level Now", acct="Finance seat (to confirm)", status="In Review", sor="QuickBooks Online", notes=REVIEW + " Close by business day 5. Revenue is recognized as invoiced (no deferral).",
         desc="Next Level Now closes the books in QuickBooks Online; the CEO and the Managing Partner over Operations review before the close is finalized."),
    dict(id="9.2.1.S1", name="Set up new clients and payment terms", owner="To confirm", acct="Finance seat (to confirm)", sor="HaloPSA", sup="QuickBooks Online", notes=REVIEW + " Credit and terms policy to be revised.",
         desc="Today every client is on Net 30 with no credit check; Sparkhound plans to change this. Halo owns the client record and QuickBooks Online follows it."),
]
byid = {p["id"]: p for p in procs}
for k, v in POLICY_OWNERS.items():
    byid[k].update(v)
for e in EXTRA:
    par = e["id"].rsplit(".", 1)[0]
    pp = byid[par]
    row = dict(pcf=None, lvl=pp["lvl"] + 1, cat=pp["cat"], rel="Core", scope="Yes", fn=pp["fn"], bu=pp["bu"], sup="", ctl="SOC 2" if "pol" in e else pp["ctl"],
               pri="1 - Now", acct="", status="Not Started", mat="", kpi="", notes="", metrics=0, added=True)
    row.update(e)
    # insert after the parent's last descendant (including extras already placed)
    i = max(n for n, p in enumerate(procs) if p["id"] == par or p["id"].startswith(par + "."))
    procs.insert(i + 1, row)
    byid[row["id"]] = row
for p in procs:
    if "pol" in p:
        p["pol"] = [POL[x] for x in p["pol"]]

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
