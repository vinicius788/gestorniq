import { AppProviders } from "@/app/AppProviders";
import { AppRouter } from "@/app/routes/AppRouter";

const App = () => (
  <AppProviders>
    <AppRouter />
  </AppProviders>
);

export default App;
