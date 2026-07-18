"use client";

import {
  Stethoscope,
  Smile,
  HeartPulse,
  Sun,
  Baby,
  Flower2,
  Bone,
  Eye,
  Ear,
  Brain,
  type LucideIcon,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  Stethoscope,
  Smile,
  HeartPulse,
  Sun,
  Baby,
  Flower2,
  Bone,
  Eye,
  Ear,
  Brain,
};

export function SpecialtyIcon({ name, className }: { name: string; className?: string }) {
  const Icon = MAP[name] ?? Stethoscope;
  return <Icon className={className} />;
}
