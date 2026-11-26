import { createBrowserRouter, Navigate, RouterProvider } from "react-router";
import { ROUTES } from "./game";
import { BattlePage } from "./pages/BattlePage";
import { HallOfFamePage } from "./pages/HallOfFamePage";
import { Layout } from "./pages/Layout";
import { ResultPage } from "./pages/ResultPage";
import { ShopPage } from "./pages/ShopPage";
import { StartPage } from "./pages/StartPage";
import { GameProvider } from "./state/GameProvider";
import { RequireRoute } from "./state/RequireRoute";

const router = createBrowserRouter([
  {
    path: ROUTES.start,
    element: <Layout />,
    children: [
      { index: true, element: <RequireRoute route={ROUTES.start}><StartPage /></RequireRoute> },
      { path: ROUTES.shop, element: <RequireRoute route={ROUTES.shop}><ShopPage /></RequireRoute> },
      { path: ROUTES.battle, element: <RequireRoute route={ROUTES.battle}><BattlePage /></RequireRoute> },
      { path: ROUTES.result, element: <RequireRoute route={ROUTES.result}><ResultPage /></RequireRoute> },
      // Reachable with and without a run, so it has no RequireRoute.
      { path: ROUTES.hallOfFame, element: <HallOfFamePage /> },
      { path: "*", element: <Navigate to={ROUTES.start} replace /> },
    ],
  },
]);

export default function App() {
  return (
    <GameProvider>
      <RouterProvider router={router} />
    </GameProvider>
  );
}
