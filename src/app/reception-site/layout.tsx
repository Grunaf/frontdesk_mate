export default function ReceptionSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
    </div>
  );
}
