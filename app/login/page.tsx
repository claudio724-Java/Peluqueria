import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

function LoginFormFallback() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold">HairBook</h1>
        <p className="text-sm text-muted-foreground">
          Accede al panel de tu peluquería
        </p>
      </div>

      <div className="rounded-lg border p-6">
        <p className="text-sm text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Suspense fallback={<LoginFormFallback />}>
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold">HairBook</h1>
            <p className="text-sm text-muted-foreground">
              Accede al panel de tu peluquería
            </p>
          </div>

          <LoginForm />
        </div>
      </Suspense>
    </div>
  );
}