import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
// Import de solo-tipos: no agrega exceljs/file-saver al bundle inicial.
// El código real se carga recién al exportar (ver exportExcel()).
import type ExcelJS from 'exceljs';

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

  async exportExcel(): Promise<void> {
    if (!this.data || this.data.length === 0) return;

    // Carga diferida: exceljs y file-saver solo se descargan cuando el usuario exporta.
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver'),
    ]);

    // 🔹 1. Crear libro y hoja
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Datos');

    // 🔹 2. Definir columnas (encabezado + ancho automático)
    ws.columns = this.columns.map(col => ({
      header: col.label,
      key: col.key,
      width: Math.max(
        col.label.length + 2,
        ...this.data.map(r => (r[col.key] ? String(r[col.key]).length + 2 : 10))
      ),
    }));

    // 🔹 3. Cargar filas
    this.data.forEach(row => ws.addRow(row));

    // 🔹 4. Aplicar estilos básicos (negrita al header)
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // 🔹 5. Generar archivo Excel (.xlsx)
    const excelBuffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${this.fileName}.xlsx`);
  }
}
