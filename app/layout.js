// app/layout.js
import "./globals.css";
import { OnboardingProvider } from "./context/OnboardingContext";

export const metadata = {
  title: "Synera",
  description: "Your wellness journey",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OnboardingProvider>{children}</OnboardingProvider>
      </body>
    </html>
  );
}
