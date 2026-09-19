import { ThemeProvider } from '@/hooks/useTheme';
import { AppRouter } from '@/routes';
import { TooltipProvider } from '@/components/ui';

export default function App() {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <AppRouter />
      </TooltipProvider>
    </ThemeProvider>
  );
}
