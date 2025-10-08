import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
}

const normalizeValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' && !Number.isFinite(value)) {
    return '';
  }
  return String(value);
};

const buildCsvContent = <T,>(columns: ExportColumn<T>[], rows: T[]): string => {
  const headerRow = columns
    .map((column) => `"${column.header.replace(/"/g, '""')}"`)
    .join(',');

  const dataRows = rows.map((row) =>
    columns
      .map((column) => {
        const rawValue = column.accessor(row);
        const normalized = normalizeValue(rawValue);
        return `"${normalized.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  return ['\ufeff' + headerRow, ...dataRows].join('\r\n');
};

export const exportToCsv = <T,>(filename: string, columns: ExportColumn<T>[], rows: T[]) => {
  if (!rows.length) {
    throw new Error('No data available for CSV export');
  }

  const csvContent = buildCsvContent(columns, rows);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPdf = <T,>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
  options?: {
    orientation?: 'portrait' | 'landscape';
    titleAlign?: 'left' | 'center';
  }
) => {
  if (!rows.length) {
    throw new Error('No data available for PDF export');
  }

  const orientation = options?.orientation ?? (columns.length > 5 ? 'landscape' : 'portrait');
  const doc = new jsPDF({ orientation });

  doc.setFontSize(14);
  const titleAlign = options?.titleAlign ?? 'left';
  const pageWidth = doc.internal.pageSize.getWidth();
  const titleX = titleAlign === 'center' ? pageWidth / 2 : 14;
  doc.text(title, titleX, 18, { align: titleAlign });
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 24);

  const head = [columns.map((column) => column.header)];
  const body = rows.map((row) => columns.map((column) => normalizeValue(column.accessor(row))));

  autoTable(doc, {
    startY: 28,
    head,
    body,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [41, 94, 140] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  doc.save(filename);
};

export const formatDateForExport = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toISOString().split('T')[0];
};
