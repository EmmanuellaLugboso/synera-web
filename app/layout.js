import "./globals.css";
import { OnboardingProvider } from "./context/OnboardingContext";
import ThemeProvider from "./components/ThemeProvider";
import LazySyraAssistant from "./components/LazySyraAssistant";

export const metadata = {
  title: "Synera",
  description: "Your wellness journey",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <OnboardingProvider>{children}<LazySyraAssistant /></OnboardingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
