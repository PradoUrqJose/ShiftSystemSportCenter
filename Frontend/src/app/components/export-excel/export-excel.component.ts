import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
// Import de solo-tipos: no agrega exceljs/file-saver al bundle inicial.
// El código real se carga recién al exportar (ver exportExcel()).
import type ExcelJS from 'exceljs';

export interface ExportColumn {
  key: string;
  label: string;
}

// Una hoja del libro cuando se exporta con [sheets] (múltiples hojas) en vez
// de [data]/[columns] (una sola hoja "Datos", comportamiento original).
export interface ExportSheet {
  name: string;
  data: Array<Record<string, any>>;
  columns: ExportColumn[];
}

@Component({
  selector: 'app-export-excel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      class="h-10 px-4 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      [disabled]="disabled || !hayDatosParaExportar()"
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
  // Si viene seteado, exportExcel() genera una hoja por entrada y [data]/
  // [columns] se ignoran — así horas-trabajadas/turnos-feriados (que solo
  // usan [data]/[columns]) no cambian de comportamiento.
  @Input() sheets?: ExportSheet[];
  @Input() fileName: string = 'reporte';
  @Input() disabled: boolean = false;

  hayDatosParaExportar(): boolean {
    if (this.sheets) {
      return this.sheets.some(sheet => sheet.data.length > 0);
    }
    return !!this.data && this.data.length > 0;
  }

  async exportExcel(): Promise<void> {
    if (!this.hayDatosParaExportar()) return;

    // Carga diferida: exceljs y file-saver solo se descargan cuando el usuario exporta.
    const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver'),
    ]);

    const wb = new ExcelJS.Workbook();
    const sheets = this.sheets ?? [{ name: 'Datos', data: this.data, columns: this.columns }];
    sheets.forEach(sheet => this.agregarHoja(wb, sheet));

    const excelBuffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, `${this.fileName}.xlsx`);
  }

  private agregarHoja(wb: ExcelJS.Workbook, sheet: ExportSheet): void {
    const ws = wb.addWorksheet(sheet.name);

    // Columnas (encabezado + ancho automático)
    ws.columns = sheet.columns.map(col => ({
      header: col.label,
      key: col.key,
      width: Math.max(
        col.label.length + 2,
        ...sheet.data.map(r => (r[col.key] ? String(r[col.key]).length + 2 : 10))
      ),
    }));

    sheet.data.forEach(row => ws.addRow(row));

    // Estilos básicos (negrita al header)
    ws.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo-600
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }
}
