import React from "react";

interface LayoutProps {
  children: React.ReactNode;
}

export const StudentDashboardLayout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#f8fafc" }}>
      {children}
    </div>
  );
};
