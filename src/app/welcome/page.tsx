// Импортируем главный компонент из слоя features
import { WelcomeScreen } from "@/features/welcome/ui/WelcomeScreen";

interface PageProps {
  searchParams: Promise<{ mode?: string }>;
}

export default async function WelcomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const isOnsite = params.mode === 'onsite';

  return <WelcomeScreen isOnsite={isOnsite} />;
}