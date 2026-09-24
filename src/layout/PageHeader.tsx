import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, meta, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-5 px-4 pt-6 sm:px-[38px] sm:pt-[30px]">
      <div>
        <div className="text-[13px] font-semibold text-t3">Electric Line Peru S.A.C.</div>
        <h1 className="mt-[5px] text-[28px] font-extrabold text-t1">{title}</h1>
        {meta && <div className="mt-[3px] text-[12.5px] text-t3">{meta}</div>}
      </div>
      {actions && <div className="flex flex-wrap justify-end gap-2 pt-[3px]">{actions}</div>}
    </div>
  );
}
