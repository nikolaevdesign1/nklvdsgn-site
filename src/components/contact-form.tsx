"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const services = ["Website", "Branding", "Development", "Consulting", "Support", "Other"];
const timelines = ["1 month", "2–3 months", "3–6 months", "1 year"];
const budgets = ["Under $10k", "$10k–20k", "$20k–50k", "Unlimited"];

const fieldClass =
  "w-full cursor-text resize-none border-0 border-b border-white/35 bg-transparent px-0 py-2 font-sans text-base text-white caret-white outline-none placeholder:text-white/70 focus-visible:border-ice";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [thanks, setThanks] = useState(false);
  const [formError, setFormError] = useState("");
  const [errors, setErrors] = useState({ name: "", email: "", message: "" });
  const [pickedServices, setPickedServices] = useState<string[]>([]);
  const [timeline, setTimeline] = useState("");
  const [budget, setBudget] = useState("");

  function toggle(list: string[], value: string, setList: (next: string[]) => void) {
    setList(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const link = String(data.get("link") ?? "").trim();
    const nextErrors = { name: "", email: "", message: "" };

    if (!name) nextErrors.name = "Enter a name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = "Enter a valid email.";
    if (!message) nextErrors.message = "Describe the project.";
    if (message.length > 4000) nextErrors.message = "Message is too long.";

    if (nextErrors.name || nextErrors.email || nextErrors.message) {
      setErrors(nextErrors);
      setStatus("error");
      setFormError("Check the fields and try again.");
      return;
    }

    setErrors({ name: "", email: "", message: "" });
    setFormError("");
    setStatus("sending");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          company,
          link,
          services: pickedServices,
          timeline,
          budget,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatus("error");
        setFormError(payload.error ?? "Could not send the message.");
        return;
      }
      form.reset();
      setPickedServices([]);
      setTimeline("");
      setBudget("");
      setStatus("idle");
      setThanks(true);
    } catch {
      setStatus("error");
      setFormError("Could not send the message.");
    }
  }

  return (
    <>
    <form onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-8 text-white">
      <fieldset className="flex flex-col gap-4">
        <legend className="font-mono text-[12px] text-white">General information</legend>
        <Field id="contact-name" label="Your name" required error={errors.name}>
          <input id="contact-name" name="name" autoComplete="name" className={fieldClass} />
        </Field>
        <Field id="contact-email" label="Email address" required error={errors.email}>
          <input id="contact-email" name="email" type="email" autoComplete="email" className={fieldClass} />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-mono text-[12px] text-white">Project details</legend>
        <Field id="contact-company" label="Company / project name">
          <input id="contact-company" name="company" className={fieldClass} />
        </Field>
        <Field id="contact-message" label="Describe your project" error={errors.message}>
          <textarea id="contact-message" name="message" rows={4} className={fieldClass} />
        </Field>
        <Field id="contact-link" label="Website link">
          <input id="contact-link" name="link" type="url" className={fieldClass} />
        </Field>
      </fieldset>

      <ChipGroup
        legend="You need"
        options={services}
        value={pickedServices}
        onToggle={(value) => toggle(pickedServices, value, setPickedServices)}
      />
      <ChipGroup
        legend="Expected timeline"
        options={timelines}
        value={timeline ? [timeline] : []}
        onToggle={(value) => setTimeline(timeline === value ? "" : value)}
      />
      <ChipGroup
        legend="Expected budget (USD)"
        options={budgets}
        value={budget ? [budget] : []}
        onToggle={(value) => setBudget(budget === value ? "" : value)}
      />

      {formError ? (
        <p className="font-mono text-[12px] text-danger" role="alert">
          {formError}
        </p>
      ) : null}

      <div className="border-t border-white/20 pt-6 text-white">
        <p className="font-sans text-3xl leading-none text-white">Ready to start your project?</p>
        <p className="mt-3 font-sans text-sm text-white">Let&apos;s bring it to life</p>
        <Button
          type="submit"
          disabled={status === "sending"}
          className="mt-10 h-8 cursor-pointer rounded-none bg-transparent px-0 font-mono text-[12px] text-white hover:bg-transparent hover:text-white/70"
        >
          {status === "sending" ? "Sending" : "Submit"}
        </Button>
      </div>
    </form>
    <Dialog open={thanks} onOpenChange={setThanks} disablePointerDismissal>
      <DialogContent
        className="bg-[#0a0a0b] text-white ring-white/20 ![animation:none]"
        showCloseButton
      >
        <DialogHeader className="pr-8">
          <DialogTitle className="font-sans text-2xl text-white">Thank you</DialogTitle>
          <DialogDescription className="text-base text-white">
            We&apos;ll write to you shortly.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
    </>
  );
}

function Field({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-sans text-sm text-white">
          {`{ ${label}${required ? " *" : ""} }`}
        </label>
        {required ? <span className="font-mono text-[11px] text-white">Required</span> : null}
      </div>
      {children}
      {error ? <p className="font-mono text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}

function ChipGroup({
  legend,
  options,
  value,
  onToggle,
}: {
  legend: string;
  options: string[];
  value: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-sm text-white">{`{ ${legend} }`}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const on = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => onToggle(option)}
              className={`cursor-pointer border px-2 py-1 font-mono text-[12px] text-white ${on ? "border-white bg-white/15" : "border-white/30 hover:border-white"}`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
