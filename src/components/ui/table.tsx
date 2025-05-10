import React from "react";

export function Table({ children, className }: any) {
  return (
    <table className={`border-collapse ${className}`}>
      {children}
    </table>
  );
}
