import { useContext } from "react";
import { TimerSettingsContext } from "../contexts/TimerSettingsContext";

export { DEFAULT_TIMER_SETTINGS } from "../contexts/TimerSettingsContext";

export const useTimerSettings = () => {
  const context = useContext(TimerSettingsContext);
  if (context === undefined) {
    throw new Error(
      "useTimerSettings must be used within a TimerSettingsProvider",
    );
  }
  return context;
};
