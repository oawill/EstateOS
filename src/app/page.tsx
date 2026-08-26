import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/shared/ui";
import { getCurrentUser } from "@/server/auth/session";
import { listMembershipsForUser } from "@/server/modules/estates/service";
import { LandingPage } from "./LandingPage";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return <LandingPage />;
  if (user.isPlatformAdmin) redirect("/platform");

  const memberships = await listMembershipsForUser(user.id);

  if (memberships.length === 0) redirect("/onboarding/new-estate");
  if (memberships.length === 1) redirect(`/${memberships[0].estate.slug}/dashboard`);

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <h1 className="text-xl font-semibold">Choose an estate</h1>
      <div className="mt-6 space-y-3">
        {memberships.map((m) => (
          <Link key={m.id} href={`/${m.estate.slug}/dashboard`}>
            <Card className="transition-shadow hover:shadow-md">
              <p className="font-medium">{m.estate.name}</p>
              <p className="text-sm text-slate-500">{m.role.replaceAll("_", " ")}</p>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
