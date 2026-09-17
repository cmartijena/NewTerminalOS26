import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { router } from "@/routes/routes";
import { AuthProvider, useAuth } from "@/auth/AuthContext";
import { LoginPage } from "@/auth/LoginPage";

function Gate() {
  const { currentUser, isReady } = useAuth();
  if (!isReady) return null;
  if (!currentUser) return <LoginPage />;
  return <RouterProvider router={router} />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Gate />
      </AuthProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
