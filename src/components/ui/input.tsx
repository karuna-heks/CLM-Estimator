import React from "react";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`border rounded px-2 py-1 w-full ${props.className ?? ""}`}
    />
  );
}
