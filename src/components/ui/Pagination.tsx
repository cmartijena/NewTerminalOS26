import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: Props) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between px-1 text-[12.5px] text-t3">
      <span>
        Mostrando <b className="font-mono text-t2">{start}–{end}</b> de{" "}
        <b className="font-mono text-t2">{totalItems}</b>
      </span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          title="Anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft size={15} />
        </button>
        <span>
          Página <b className="text-t2">{page}</b> de <b className="text-t2">{totalPages}</b>
        </span>
        <button
          type="button"
          title="Siguiente"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-bg disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
