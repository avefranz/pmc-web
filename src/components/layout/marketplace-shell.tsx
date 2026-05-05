import { Outlet } from "react-router-dom";

/** V2 marketplace — each page owns its own nav & footer. Shell is a pure wrapper. */
export function MarketplaceShell() {
  return (
    <div style={{ background: "#FFFCF7", minHeight: "100vh" }}>
      <Outlet />
    </div>
  );
}
