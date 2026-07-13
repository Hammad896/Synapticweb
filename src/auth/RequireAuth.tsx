import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./auth";

/**
 * Route guard. Renders nothing until the session has been restored, so a
 * signed-in admin never sees the login screen flash on refresh.
 *
 * Note what this is and isn't: it decides what the app *renders*, which is a UX
 * concern. It is not a security boundary — the bundle is already on the user's
 * machine. Real protection means the server refusing to send the data at all.
 */
const RequireAuth = ({ children }: { children: ReactNode }) => {
  const { user, isReady } = useAuth();

  if (!isReady) return null;
  if (!user) return <Navigate to="/staff-login" replace />;

  return <>{children}</>;
};

export default RequireAuth;
