import { useEffect, useCallback } from "react";

export const useHaptic = () => {
  useEffect(() => {
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "checkbox";
    hiddenInput.setAttribute("switch", "");
    hiddenInput.id = "haptic-trigger-hack";
    hiddenInput.style.position = "absolute";
    hiddenInput.style.opacity = "0";
    hiddenInput.style.pointerEvents = "none";
    document.body.appendChild(hiddenInput);

    const hiddenLabel = document.createElement("label");
    hiddenLabel.htmlFor = "haptic-trigger-hack";
    hiddenLabel.id = "haptic-label-hack";
    hiddenLabel.style.display = "none";
    document.body.appendChild(hiddenLabel);

    return () => {
      document.body.removeChild(hiddenInput);
      document.body.removeChild(hiddenLabel);
    };
  }, []);

  const triggerHaptic = useCallback(() => {
    const label = document.getElementById("haptic-label-hack");
    if (label) label.click();
  }, []);

  return triggerHaptic;
};
