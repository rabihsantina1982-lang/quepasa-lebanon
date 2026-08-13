"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SignInDialog } from "./SignInDialog";

export function SignInAutoOpen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const next = searchParams.get("next") ?? undefined;

  useEffect(() => {
    if (searchParams.get("signin") === "1") setOpen(true);
  }, [searchParams]);

  function handleClose() {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("signin");
    params.delete("next");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return <SignInDialog open={open} onClose={handleClose} next={next} />;
}
