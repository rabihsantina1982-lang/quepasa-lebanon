"use client";
import { useState } from "react";
import { Button } from "./ui/button";
import { SignInDialog } from "./SignInDialog";

export function SignInButton({ label }: { label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setOpen(true)}>{label}</Button>
      <SignInDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
