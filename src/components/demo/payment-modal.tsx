"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, X, Smartphone, CreditCard, Clock } from "lucide-react";
import { Modal } from "./modal";
import { Button } from "@/components/ui";
import { PAYMENT_METHODS, useDemo } from "@/demo/store";
import { formatMoney, cn } from "@/lib/utils";
import type { PaymentMethod, PaymentStatus } from "@/demo/types";

const METHOD_META: Record<PaymentMethod, { color: string; icon: React.ReactNode; hint: string }> = {
  MVola: { color: "#ffd200", icon: <Smartphone className="h-5 w-5" />, hint: "Telma mobile money" },
  "Orange Money": { color: "#ff7900", icon: <Smartphone className="h-5 w-5" />, hint: "Orange mobile money" },
  "Airtel Money": { color: "#e40000", icon: <Smartphone className="h-5 w-5" />, hint: "Airtel mobile money" },
  "Credit Card": { color: "#635bff", icon: <CreditCard className="h-5 w-5" />, hint: "Visa / Mastercard" },
};

type Phase = "select" | "processing" | "result";

export function PaymentModal({
  open,
  amount,
  onClose,
  onComplete,
}: {
  open: boolean;
  amount: number;
  onClose: () => void;
  onComplete: (method: PaymentMethod, status: PaymentStatus) => void;
}) {
  const { simulatePayment } = useDemo();
  const [phase, setPhase] = useState<Phase>("select");
  const [method, setMethod] = useState<PaymentMethod>("MVola");
  const [result, setResult] = useState<PaymentStatus | null>(null);

  function reset() {
    setPhase("select");
    setResult(null);
  }

  async function pay() {
    setPhase("processing");
    const status = await simulatePayment(method);
    setResult(status);
    setPhase("result");
  }

  function finish() {
    if (result) onComplete(method, result);
    reset();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Payment"
      hideClose={phase === "processing"}
    >
      <div className="p-5">
        <div className="mb-4 rounded-lg bg-muted p-4 text-center">
          <p className="text-xs text-muted-foreground">Amount to pay</p>
          <p className="text-2xl font-bold">{formatMoney(amount)}</p>
        </div>

        <AnimatePresence mode="wait">
          {phase === "select" && (
            <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <p className="mb-2 text-sm font-medium">Choose a payment method</p>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3 text-left transition-all",
                      method === m ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span
                      className="grid h-9 w-9 place-items-center rounded-md text-white"
                      style={{ background: METHOD_META[m].color }}
                    >
                      {METHOD_META[m].icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{m}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{METHOD_META[m].hint}</span>
                    </span>
                  </button>
                ))}
              </div>
              <Button className="mt-5 w-full" size="lg" onClick={pay}>
                Pay {formatMoney(amount)}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Demo only — no real transaction. Outcome is simulated.
              </p>
            </motion.div>
          )}

          {phase === "processing" && (
            <motion.div
              key="processing"
              className="flex flex-col items-center py-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="mt-4 font-medium">Processing {method}…</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Confirm the prompt on your phone
              </p>
            </motion.div>
          )}

          {phase === "result" && result && (
            <motion.div
              key="result"
              className="flex flex-col items-center py-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {result === "paid" && (
                <>
                  <motion.div
                    className="grid h-16 w-16 place-items-center rounded-full bg-emerald-500 text-white"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  >
                    <Check className="h-8 w-8" />
                  </motion.div>
                  <p className="mt-4 text-lg font-semibold">Payment successful</p>
                  <p className="mt-1 text-sm text-muted-foreground">Paid with {method}</p>
                </>
              )}
              {result === "pending" && (
                <>
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-amber-500 text-white">
                    <Clock className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-lg font-semibold">Payment pending</p>
                  <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
                    Awaiting confirmation from {method}. You can pay at the clinic instead.
                  </p>
                </>
              )}
              {result === "failed" && (
                <>
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-rose-500 text-white">
                    <X className="h-8 w-8" />
                  </div>
                  <p className="mt-4 text-lg font-semibold">Payment failed</p>
                  <p className="mt-1 max-w-xs text-center text-sm text-muted-foreground">
                    The {method} transaction didn&apos;t go through. Try another method.
                  </p>
                </>
              )}

              <div className="mt-6 flex w-full gap-2">
                {result === "failed" ? (
                  <>
                    <Button variant="outline" className="flex-1" onClick={reset}>
                      Try again
                    </Button>
                    <Button className="flex-1" onClick={finish}>
                      Continue anyway
                    </Button>
                  </>
                ) : (
                  <Button className="w-full" onClick={finish}>
                    Continue
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  );
}
