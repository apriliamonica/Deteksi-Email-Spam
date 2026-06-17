import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = startPage + maxPagesToShow - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
            currentPage === i
              ? 'bg-ocean text-white shadow-sm'
              : 'text-app-text-muted hover:bg-ocean/10 hover:text-ocean'
          }`}
        >
          {i}
        </button>
      );
    }
    return pageNumbers;
  };

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-app-text-muted hover:bg-ocean/10 hover:text-ocean disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="First Page"
      >
        <ChevronsLeft size={18} />
      </button>
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1.5 rounded-lg text-app-text-muted hover:bg-ocean/10 hover:text-ocean disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Previous Page"
      >
        <ChevronLeft size={18} />
      </button>
      
      <div className="flex items-center gap-1 px-2">
        {renderPageNumbers()}
      </div>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-app-text-muted hover:bg-ocean/10 hover:text-ocean disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Next Page"
      >
        <ChevronRight size={18} />
      </button>
      <button
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="p-1.5 rounded-lg text-app-text-muted hover:bg-ocean/10 hover:text-ocean disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        title="Last Page"
      >
        <ChevronsRight size={18} />
      </button>
    </div>
  );
}
