import { useContext } from "react";
import { RewardContext } from "../contexts/RewardContext";

export const useReward = () => {
  const context = useContext(RewardContext);
  if (context === undefined) {
    throw new Error("useReward must be used within a RewardProvider");
  }
  return context;
};
