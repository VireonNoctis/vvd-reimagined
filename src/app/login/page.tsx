import { AuthForm } from "@/components/auth/auth-form";
import { apiConfigured } from "@/server/api";

export default function LoginPage() {
  return <AuthForm enabled={apiConfigured} />;
}
