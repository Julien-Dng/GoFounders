import { createBrowserRouter } from "react-router";
import RootLayout from "./layouts/RootLayout";
import LandingPage from "./pages/LandingPage";
import PricingPage from "./pages/PricingPage";
import SearchPage from "./pages/SearchPage";
import DashboardPage from "./pages/DashboardPage";
import MAMarketplacePage from "./pages/MAMarketplacePage";
import AIPitchGeneratorPage from "./pages/AIPitchGeneratorPage";
import OnboardingPage from "./pages/OnboardingPage";
import ProfilePage from "./pages/ProfilePage";
import AIAssistantPage from "./pages/AIAssistantPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: LandingPage },
      { path: "tarifs", Component: PricingPage },
      { path: "recherche", Component: SearchPage },
      { path: "ma", Component: MAMarketplacePage },
      { path: "generateur-pitch", Component: AIPitchGeneratorPage },
      { path: "onboarding", Component: OnboardingPage },
      { path: "dashboard", Component: DashboardPage },
      { path: "tableau-de-bord", Component: DashboardPage },
      { path: "profil/:id", Component: ProfilePage },
      { path: "assistant", Component: AIAssistantPage },
    ],
  },
]);
