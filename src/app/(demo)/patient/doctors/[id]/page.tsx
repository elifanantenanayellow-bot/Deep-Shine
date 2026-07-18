"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Mail, Globe, CalendarPlus, Clock } from "lucide-react";
import { useDemo } from "@/demo/store";
import { specialtyName, clinicName, availableSlots } from "@/demo/selectors";
import { DashboardSkeleton } from "@/components/demo/portal-shell";
import { Avatar, RatingStars, EmptyState } from "@/components/demo/primitives";
import { SpecialtyIcon } from "@/components/demo/specialty-icon";
import { BookingWizard } from "@/components/demo/booking-wizard";
import { FadeIn } from "@/components/demo/motion";
import { Button, Card } from "@/components/ui";
import { cn, formatMoney } from "@/lib/utils";

export default function DoctorProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { ready, data } = useDemo();
  const router = useRouter();
  const [bookOpen, setBookOpen] = useState(false);

  const doctor = data.doctors.find((d) => d.id === id);
  const clinic = data.clinics.find((c) => c.id === doctor?.clinicId);

  const previewDay = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d;
  }, []);
  const slots = useMemo(
    () => (doctor ? availableSlots(data, doctor.id, previewDay) : []),
    [data, doctor, previewDay],
  );

  if (!ready) return <DashboardSkeleton />;
  if (!doctor) {
    return (
      <EmptyState
        title="Doctor not found"
        description="This doctor may have been removed from the demo."
        action={<Button onClick={() => router.push("/patient/doctors")}>Back to doctors</Button>}
      />
    );
  }

  return (
    <>
      <Link href="/patient/doctors" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> All doctors
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <FadeIn className="lg:col-span-2">
          <Card className="p-6">
            <div className="flex flex-wrap items-start gap-4">
              <Avatar name={doctor.name} hue={doctor.avatarHue} size={72} />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl font-semibold">{doctor.name}</h1>
                <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <SpecialtyIcon name={data.specialties.find((s) => s.id === doctor.specialtyId)?.icon ?? "Stethoscope"} className="h-4 w-4" />
                  {specialtyName(data, doctor.specialtyId)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <RatingStars value={doctor.rating} count={doctor.reviews} />
                  <span className="text-xs text-muted-foreground">{doctor.experienceYears} years experience</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatMoney(doctor.consultationFee)}</p>
                <p className="text-xs text-muted-foreground">per consultation</p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{doctor.bio}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {doctor.languages.map((l) => (
                <span key={l} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                  <Globe className="h-3 w-3" /> {l}
                </span>
              ))}
            </div>

            <div className="mt-6 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-2">
              <InfoRow icon={<MapPin className="h-4 w-4" />} value={`${clinic?.name} · ${clinic?.city}`} />
              <InfoRow icon={<Phone className="h-4 w-4" />} value={doctor.phone} />
              <InfoRow icon={<Mail className="h-4 w-4" />} value={doctor.email} />
              <InfoRow icon={<MapPin className="h-4 w-4" />} value={clinic?.address ?? ""} />
            </div>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Availability today</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {previewDay.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {slots.length === 0 && (
              <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Not working today — use the booking button to see other days.
              </p>
            )}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {slots.slice(0, 12).map((s) => (
                <button
                  key={s.iso}
                  disabled={s.taken}
                  onClick={() => setBookOpen(true)}
                  className={cn(
                    "rounded-md border py-2 text-xs transition-colors",
                    s.taken
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground line-through"
                      : "border-border hover:border-primary hover:bg-primary/10 hover:text-primary",
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
            <Button className="mt-5 w-full gap-2" size="lg" onClick={() => setBookOpen(true)}>
              <CalendarPlus className="h-4 w-4" /> Book appointment
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {clinicName(data, doctor.clinicId)}
            </p>
          </Card>
        </FadeIn>
      </div>

      <BookingWizard open={bookOpen} onClose={() => setBookOpen(false)} presetDoctor={doctor} />
    </>
  );
}

function InfoRow({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
