// Funciones puras de color, extraídas de colaborador-profile.component.ts
// (mezclaban ahí con la carga de datos y la configuración de los gráficos,
// sin relación real con "reporte de colaborador" — son utilidades genéricas
// de color, testeables solas).

// Paleta fija para asignar un color estable a cada empresa (por hash de su
// nombre, ver getEmpresaColor) — se usa tanto en los gráficos como en el
// fondo del perfil de colaborador.
export const COLORES_EMPRESAS: readonly string[] = [
  '#fff3cc', // Amarillo pastel
  '#cce5ff', // Azul pastel
  '#f0e5de', // Beige claro
  '#b3e0ff', // Celeste pastel
  '#d4f4dd', // Verde menta suave
  '#ffccd9', // Rosa empolvado
  '#e6ccff', // Lila suave
  '#ffddcc', // Melocotón pastel
];

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
}

export function darkenColor(r: number, g: number, b: number, factor: number): { r: number; g: number; b: number } {
  return {
    r: Math.max(0, Math.floor(r * (1 - factor))),
    g: Math.max(0, Math.floor(g * (1 - factor))),
    b: Math.max(0, Math.floor(b * (1 - factor))),
  };
}

// Aclara (percent > 0) u oscurece (percent < 0) un color hex.
export function lightenDarkenColor(color: string, percent: number): string {
  const rgb = hexToRgb(color);
  const factor = percent / 100;
  const r = Math.min(255, Math.max(0, rgb.r + (255 - rgb.r) * factor));
  const g = Math.min(255, Math.max(0, rgb.g + (255 - rgb.g) * factor));
  const b = Math.min(255, Math.max(0, rgb.b + (255 - rgb.b) * factor));
  return rgbToHex(r, g, b);
}

// Color estable por nombre de empresa: mismo hash simple del nombre siempre
// da el mismo índice de paleta, así cada empresa "tiene" un color sin
// guardarlo en la base de datos.
export function getEmpresaColor(empresaNombre: string | undefined, paleta: readonly string[] = COLORES_EMPRESAS): string {
  if (!empresaNombre || empresaNombre === 'N/A') {
    return '#e5e7eb'; // Gris claro por defecto
  }
  let hash = 0;
  for (let i = 0; i < empresaNombre.length; i++) {
    hash = empresaNombre.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash % paleta.length);
  return paleta[index];
}

// Estilos de fondo del perfil (con o sin el patrón de texto repetido del
// nombre de la empresa). Antes recalculaba el hash de nuevo acá adentro en
// vez de reusar getEmpresaColor — quedaba duplicado.
export function getWallpStyles(
  empresaNombre: string | undefined,
  conPatron: boolean,
  paleta: readonly string[] = COLORES_EMPRESAS
): Record<string, string | number> {
  if (!empresaNombre || empresaNombre === 'N/A') {
    return { 'background-color': '#e5e7eb' };
  }

  const backgroundColor = getEmpresaColor(empresaNombre, paleta);
  const rgb = hexToRgb(backgroundColor);
  const darker = darkenColor(rgb.r, rgb.g, rgb.b, 0.09);
  const darkerHex = rgbToHex(darker.r, darker.g, darker.b);

  if (conPatron) {
    const pattern = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='20'><text x='5' y='12' font-size='14' fill='%23${darkerHex.slice(1)}' font-weight='bold' font-family='Quicksand, sans-serif'>${encodeURIComponent(empresaNombre)}</text></svg>")`;
    return {
      'background-color': backgroundColor,
      'background-image': pattern,
      'background-repeat': 'repeat',
      'background-size': '170px 20px',
    };
  }

  return {
    'background-color': backgroundColor,
    'color': lightenDarkenColor(darkerHex, -300),
    'font-weight:': 800,
  };
}
