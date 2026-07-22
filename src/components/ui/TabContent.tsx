import { forwardRef, type ReactNode } from "react";

interface TabContentProps {
  activeTab: number;
  slideDirection: string;
  children: ReactNode;
}

export const TabContent = forwardRef<HTMLElement, TabContentProps>(
  ({ activeTab, slideDirection, children }, ref) => {
    const slideClass =
      slideDirection === "next"
        ? "slide-next"
        : slideDirection === "prev"
          ? "slide-prev"
          : "";

    return (
      <section
        ref={ref}
        key={activeTab}
        className={`h-full overflow-y-auto px-4 py-4 pb-6 ${slideClass}`}
      >
        {children}
      </section>
    );
  },
);

TabContent.displayName = "TabContent";

export default TabContent;
