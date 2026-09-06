"use client";

import { LoaderCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function KeycloakSignInButton() {
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      type="button"
      className="mt-7 w-full"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signIn("keycloak", { callbackUrl: "/" });
      }}
    >
      {isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
      {isPending ? "Keycloakへ移動しています…" : "Keycloakで続ける"}
    </Button>
  );
}
