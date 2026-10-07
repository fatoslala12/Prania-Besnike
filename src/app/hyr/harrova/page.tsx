import { BrandMark } from "@/components/BrandMark";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { ForgotPasswordForm } from "@/components/PasswordResetForms";

export const metadata = {
  title: "Harrova fjalëkalimin",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-full flex-col hero-wash">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandMark size="md" align="center" />
        <div className="surface-card mt-8 w-full p-6 md:p-8">
          <h2 className="text-2xl font-extrabold">Harrova fjalëkalimin</h2>
          <p className="mt-2 text-sm text-muted">
            Shkruani email-in ose emrin e përdoruesit. Do t&apos;ju dërgojmë një lidhje për të vendosur
            një fjalëkalim të ri.
          </p>
          <div className="mt-6">
            <ForgotPasswordForm />
          </div>
        </div>
      </div>
      <footer className="px-4 pb-6 text-center">
        <DeveloperCredit />
      </footer>
    </div>
  );
}
