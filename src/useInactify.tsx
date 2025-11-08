import React from "react";
import { InactifyContext } from "./InactifyProvider";

export const useInactify = () => {
  const context = React.useContext(InactifyContext);
  if (!context) {
    throw new Error("useInactify must be used within an InactifyProvider");
  }
  return context;
};
