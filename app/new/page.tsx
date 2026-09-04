import { AppHeader } from "@/components/AppHeader";

export default function NewAssessmentPlaceholder() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-heritage">
          The assessment flow is next
        </h1>
        <p className="mt-3 text-ink-soft">
          The version chooser and question engine arrive in the next build step
          (PRD §15, step 5). Accounts, teams, and this dashboard are live —
          invite a colleague with your team code in the meantime.
        </p>
      </main>
    </>
  );
}
