import { forwardRef, type ReactNode } from "react";

interface TabContentProps {
  activeTab: number;
  slideDirection: string;
  children: ReactNode;
}

export const TabContent = forwardRef<HTMLElement, TabContentProps>(
  ({ activeTab, slideDirection, children }, ref) => {
    return (
      <section
        ref={ref}
        key={activeTab}
        className="h-full overflow-y-auto px-4 py-4 pb-24"
        data-slide-direction={slideDirection}
      >
        {children}
      </section>
    );
  },
);

TabContent.displayName = "TabContent";

export default TabContent;
