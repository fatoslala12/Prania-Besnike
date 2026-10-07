import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { DeveloperCredit } from "@/components/DeveloperCredit";
import { Notice } from "@/components/Notice";
import { ResetPasswordForm } from "@/components/PasswordResetForms";
import { hashResetToken } from "@/lib/password-reset";
import { isPasswordResetTokenValid } from "@/lib/repo";

export const metadata = {
  title: "Fjalëkalim i ri",
  referrer: "no-referrer",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const validToken =
    typeof token === "string" &&
    token.length >= 20 &&
    token.length <= 200 &&
    (await isPasswordResetTokenValid(hashResetToken(token)))
      ? token
      : null;

  return (
    <div className="flex min-h-full flex-col hero-wash">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12">
        <BrandMark size="md" align="center" />
        <div className="surface-card mt-8 w-full p-6 md:p-8">
          <h2 className="text-2xl font-extrabold">Fjalëkalim i ri</h2>
          <div className="mt-6">
            {validToken ? (
              <ResetPasswordForm token={validToken} />
            ) : (
              <div className="space-y-4">
                <Notice tone="error">
                  Lidhja ka skaduar, është përdorur tashmë ose nuk është e plotë.
                </Notice>
                <Link href="/hyr/harrova" className="btn-primary w-full justify-center">
                  Kërko një lidhje të re
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="px-4 pb-6 text-center">
        <DeveloperCredit />
      </footer>
    </div>
  );
}
