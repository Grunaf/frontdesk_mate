interface OwnerHomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerHomePage({ params }: OwnerHomePageProps) {
  const { locale } = await params;

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">Owner dashboard</h1>
      <p className="text-sm text-muted-foreground">
        Module 1 shell — session redirect and setup wizard ship in later modules.
      </p>
      <p className="text-xs text-muted-foreground">Locale: {locale}</p>
    </div>
  );
}
