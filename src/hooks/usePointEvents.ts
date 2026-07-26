import { useContext } from "react";
import { PointEventsContext } from "../contexts/PointEventsContext";

export const usePointEvents = () => {
  const context = useContext(PointEventsContext);
  if (context === undefined) {
    throw new Error("usePointEvents must be used within a PointEventsProvider");
  }
  return context;
};
