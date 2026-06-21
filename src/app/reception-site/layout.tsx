export default function ReceptionSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-2xl px-6 py-8">{children}</main>
    </div>
  );
}
