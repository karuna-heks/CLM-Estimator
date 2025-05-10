import React from "react";

export function Select({ value, onValueChange, children }: any) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="border rounded w-full px-2 py-1"
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children }: any) {
  return <>{children}</>;
}

export function SelectValue({ placeholder }: any) {
  return <option disabled>{placeholder}</option>;
}

export function SelectContent({ children }: any) {
  return <>{children}</>;
}

export function SelectItem({ value, children }: any) {
  return <option value={value}>{children}</option>;
}
