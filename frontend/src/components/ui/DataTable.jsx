import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function DataTable({
  columns,
  data,
  pageSize = 10,
  searchable = false,
  searchPlaceholder = 'Search…',
  onRowClick,
  emptyMessage = 'No data available',
  className = '',
}) {
  const [search, setSearch] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  // Filter
  const filtered = searchable && search
    ? data.filter(row =>
        columns.some(col => {
          const val = col.accessor ? row[col.accessor] : col.render?.(row);
          return String(val ?? '').toLowerCase().includes(search.toLowerCase());
        })
      )
    : data;

  // Sort
  const sorted = sortCol !== null
    ? [...filtered].sort((a, b) => {
        const col = columns[sortCol];
        const av = col.accessor ? a[col.accessor] : '';
        const bv = col.accessor ? b[col.accessor] : '';
        if (typeof av === 'number' && typeof bv === 'number') {
          return sortDir === 'asc' ? av - bv : bv - av;
        }
        return sortDir === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      })
    : filtered;

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (idx) => {
    if (!columns[idx].sortable) return;
    if (sortCol === idx) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(idx);
      setSortDir('asc');
    }
  };

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      {/* Search */}
      {searchable && (
        <div className="px-5 pt-4 pb-2">
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder={searchPlaceholder}
            className="field text-xs"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-ink-100/60">
              {columns.map((col, i) => (
                <th
                  key={i}
                  onClick={() => handleSort(i)}
                  className={`px-5 py-3.5 text-[10px] font-bold uppercase tracking-widest text-ink-400 bg-surface-2/50 backdrop-blur-sm sticky top-0 z-10
                    ${col.sortable ? 'cursor-pointer hover:text-ink-600 select-none' : ''}
                    ${col.align === 'right' ? 'text-right' : ''}
                    ${col.align === 'center' ? 'text-center' : ''}
                  `}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortCol === i && (
                      sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100/40">
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-16 text-center text-ink-300 text-xs uppercase tracking-widest font-medium">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paged.map((row, ri) => (
                <tr
                  key={ri}
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-all duration-150 hover:bg-aurora-purple/[0.03] ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col, ci) => (
                    <td
                      key={ci}
                      className={`px-5 py-4 text-sm text-ink-700
                        ${col.align === 'right' ? 'text-right' : ''}
                        ${col.align === 'center' ? 'text-center' : ''}
                      `}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-ink-100/60 bg-surface-2/30">
          <p className="text-[11px] text-ink-400 font-medium">
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = totalPages <= 5 ? i : Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                    page === p
                      ? 'bg-aurora-purple text-white shadow-glow-purple'
                      : 'text-ink-400 hover:bg-ink-100'
                  }`}
                >
                  {p + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
