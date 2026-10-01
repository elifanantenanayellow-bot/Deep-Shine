"use client";

import { Printer } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "@/components/ui";
import { useDemo } from "@/demo/store";
import { clinicName, doctorName } from "@/demo/selectors";
import { formatMoney } from "@/lib/utils";
import type { Patient } from "@/demo/types";

// The paper the customer walks out with: what was done, what to do next, and
// two signature lines. Printed straight from the browser — no PDF service.

export function ServiceSummary({
  open,
  onClose,
  patient,
}: {
  open: boolean;
  onClose: () => void;
  patient: Patient;
}) {
  const { data } = useDemo();

  const visits = data.appointments
    .filter((a) => a.patientId === patient.id && a.status === "completed")
    .sort((a, b) => +new Date(b.start) - +new Date(a.start));
  const last = visits[0];
  const record = last ? data.records.find((r) => r.appointmentId === last.id) : undefined;
  const prescription = last
    ? data.prescriptions.find((p) => p.appointmentId === last.id)
    : undefined;
  const careNotes = data.notes.filter(
    (n) => n.patientId === patient.id && (n.kind === "care" || n.kind === "followup"),
  );
  const nextVisit = data.appointments
    .filter((a) => a.patientId === patient.id && a.status === "upcoming")
    .sort((a, b) => +new Date(a.start) - +new Date(b.start))[0];
  const clinic = last ? clinicName(data, last.clinicId) : "Centre Médical Antananarivo";

  return (
    <Modal open={open} onClose={onClose} title="Service summary" className="max-w-2xl">
      <div className="p-5">
        <div id="print-area" className="rounded-lg border border-border p-6 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
            <div>
              <p className="text-base font-semibold">{clinic}</p>
              <p className="text-xs text-muted-foreground">
                Lot II M 34, Analakely · +261 34 12 345 01
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <p>
                Issued{" "}
                {new Date().toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p>Ref. SS-{patient.id.toUpperCase()}</p>
            </div>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            <Line label="Patient" value={patient.name} />
            <Line label="Contact" value={patient.phone} />
            <Line
              label="Age / gender"
              value={`${patient.age} · ${patient.gender === "F" ? "Female" : "Male"}`}
            />
            <Line
              label="Last visit"
              value={
                last
                  ? new Date(last.start).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <Line label="Provider" value={last ? doctorName(data, last.doctorId) : "—"} />
            <Line label="Total visits" value={String(visits.length)} />
          </dl>

          <Section title="Service provided">
            {last ? (
              <>
                <p className="font-medium">{record?.diagnosis ?? last.reason}</p>
                {record?.notes && (
                  <p className="mt-1 text-muted-foreground">{record.notes}</p>
                )}
                <p className="mt-2 tabular-nums">Fee: {formatMoney(last.fee)}</p>
              </>
            ) : (
              <p className="text-muted-foreground">No completed visit on record.</p>
            )}
          </Section>

          {prescription && (
            <Section title="Prescription">
              <ul className="space-y-1">
                {prescription.lines.map((l, i) => (
                  <li key={i}>
                    <span className="font-medium">{l.drug}</span>
                    <span className="text-muted-foreground"> — {l.dosage}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {careNotes.length > 0 && (
            <Section title="Care instructions & follow-up">
              <ul className="list-disc space-y-1 pl-5">
                {careNotes.map((n) => (
                  <li key={n.id}>
                    {n.body}
                    {n.dueAt && (
                      <span className="text-muted-foreground">
                        {" "}
                        (by{" "}
                        {new Date(n.dueAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                        })}
                        )
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {nextVisit && (
            <Section title="Next appointment">
              <p>
                {new Date(nextVisit.start).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                at{" "}
                {new Date(nextVisit.start).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                — {doctorName(data, nextVisit.doctorId)}
              </p>
            </Section>
          )}

          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <Signature label="Provider signature" name={last ? doctorName(data, last.doctorId) : ""} />
            <Signature label="Patient signature" name={patient.name} />
          </div>
        </div>

        <div className="no-print mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-dashed border-border/60 py-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Signature({ label, name }: { label: string; name: string }) {
  return (
    <div>
      <div className="h-12 border-b border-foreground/40" />
      <p className="mt-1 text-xs text-muted-foreground">
        {label}
        {name && ` — ${name}`}
      </p>
    </div>
  );
}
