export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col bg-background">
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
