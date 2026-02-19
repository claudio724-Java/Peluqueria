import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">HairBook</h1>
          <p className="text-sm text-muted-foreground">Accede al panel de tu peluquería</p>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Usuario demo: <span className="font-mono">admin@hairbook.local</span> · contraseña:{" "}
          <span className="font-mono">admin1234</span>
        </p>
      </div>
    </div>
  );
}
