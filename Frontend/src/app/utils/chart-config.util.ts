// Factories de configuración de Chart.js para colaborador-profile.component.ts
// — antes estos tres objetos (~140 líneas) eran propiedades inicializadas
// inline en la clase del componente, mezclados con la carga de datos.
//
// Cada factory recibe formatearHoras porque las opciones necesitan formatear
// valores usando CalendarioService.formatearHoras (vía el componente) — se
// pasa como función en vez de importar el servicio acá para no atar esta
// configuración, que es puramente de presentación, a Angular DI.
import { ChartOptions } from 'chart.js';
import { isToday } from 'date-fns';

type FormateadorHoras = (horas: number | undefined, type: boolean) => string;

// Gráfico de barras verticales: horas trabajadas por mes (año completo).
export function crearOpcionesGraficoMensual(formatearHoras: FormateadorHoras): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {},
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Horas' },
      },
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: (context) => {
          const value = context.dataset.data[context.dataIndex] as number;
          return value > 0;
        },
        anchor: 'end',
        align: 'end',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${parseFloat(value).toFixed(0)} h`,
      },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw;
            return typeof value === 'number' ? `${formatearHoras(value, true)} h` : '';
          },
        },
      },
    },
    elements: {
      bar: { borderRadius: 10 },
    },
  };
}

// Gráfico de barras horizontales: horas trabajadas por tienda (top 6).
export function crearOpcionesGraficoTiendas(formatearHoras: FormateadorHoras): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { beginAtZero: true, title: { display: false, text: 'Horas' } },
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        display: true,
        anchor: 'end',
        align: 'end',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${formatearHoras(value, true)} h`,
      },
      tooltip: { enabled: false },
    },
    elements: {
      bar: { borderRadius: 20 },
    },
    layout: {
      padding: { right: 34 },
    },
    animation: { duration: 1500, easing: 'easeOutBounce' },
  };
}

// Gráfico de barras verticales: horas trabajadas en la semana actual (Lun-Dom).
export function crearOpcionesGraficoSemanaActual(formatearHoras: FormateadorHoras): ChartOptions<'bar'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: { color: '#6b7280', font: { size: 12 } },
      },
      y: {
        display: false,
        beginAtZero: true,
        max: 16, // Límite máximo para reducir la altura de las barras
      },
    },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: (tooltipItem) => {
            const value = tooltipItem.raw;
            return typeof value === 'number' ? `${formatearHoras(value, true)} h` : '';
          },
        },
      },
      datalabels: {
        display: (context) => isToday(new Date()) && context.dataIndex === new Date().getDay() - 1,
        anchor: 'end',
        align: 'top',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 10,
        font: { size: 10, weight: 'bold' },
        formatter: (value) => `${formatearHoras(value, true)} h`,
      },
    },
    elements: {
      bar: { borderRadius: 20 },
    },
  };
}
