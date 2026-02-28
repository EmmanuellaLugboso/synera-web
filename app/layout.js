// app/layout.js
import "./globals.css";
import { OnboardingProvider } from "./context/OnboardingContext";
import ThemeInitializer from "./components/ThemeInitializer";

export const metadata = {
  title: "Synera",
  description: "Your wellness journey",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OnboardingProvider>
          <ThemeInitializer />
          {children}
        </OnboardingProvider>
      </body>
    </html>
  );
}
