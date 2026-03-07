import "./globals.css";
import { OnboardingProvider } from "./context/OnboardingContext";
import ThemeProvider from "./components/ThemeProvider";
import SyraAssistant from "./components/SyraAssistant";

export const metadata = {
  title: "Synera",
  description: "Your wellness journey",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <OnboardingProvider>{children}<SyraAssistant /></OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
