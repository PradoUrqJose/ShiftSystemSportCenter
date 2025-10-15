import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ExportColumn {
  key: string;
  label: string;
}

@Component({
  selector: 'app-export-excel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="h-10 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      [disabled]="disabled || !data || data.length === 0"
      (click)="exportExcel()"
      title="Exportar a Excel"
    >
      <i class="fa-solid fa-file-excel"></i>
    </button>
  `,
})
export class ExportExcelComponent {
  @Input() data: Array<Record<string, any>> = [];
  @Input() columns: ExportColumn[] = [];
  @Input() fileName: string = 'reporte';
  @Input() disabled: boolean = false;

  exportExcel(): void {
    if (!this.data || this.data.length === 0) return;

    // 🔹 1. Preparar encabezados y datos
    const headers = this.columns.map(col => col.label);
    const worksheetData = [
      headers,
      ...this.data.map(row => this.columns.map(col => row[col.key] ?? '')),
    ];

    // 🔹 2. Crear hoja de cálculo
    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // 🔹 3. Ajustar ancho de columnas automáticamente
    const colWidths = this.columns.map(col => ({
      wch: Math.max(
        col.label.length + 2,
        ...this.data.map(r => (r[col.key] ? String(r[col.key]).length + 2 : 10))
      ),
    }));
    ws['!cols'] = colWidths;

    // 🔹 4. Crear libro y hoja
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // 🔹 5. Aplicar estilos básicos (negrita al header)
    const headerRange = XLSX.utils.decode_range(ws['!ref']!);
    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: C })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '4F46E5' } }, // Indigo-600
          alignment: { horizontal: 'center', vertical: 'center' },
        };
      }
    }

    // 🔹 6. Generar archivo Excel (.xlsx)
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${this.fileName}.xlsx`);
  }
}
