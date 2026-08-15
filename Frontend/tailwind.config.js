import withMT from "@material-tailwind/html/utils/withMT";

/** @type {import('tailwindcss').Config} */
module.exports = withMT({
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      // Inter como fuente principal (ver body en styles.css) — se declara
      // también acá para que `font-sans` y el fallback por defecto de
      // Tailwind (cuando una clase no especifica fuente) calcen con Inter
      // en vez del stack de sistema.
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Espejan src/app/styles/tokens.css — no duplican valores, solo
      // exponen los mismos custom properties como utilities de Tailwind
      // (ej. `bg-brand`, `rounded-pill`) para que el HTML utility-first y
      // el CSS de componente siempre calcen en el mismo píxel.
      colors: {
        brand: {
          DEFAULT: 'var(--color-brand)',
          hover: 'var(--color-brand-hover)',
          soft: 'var(--color-brand-soft)',
          ink: 'var(--color-brand-ink)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          soft: 'var(--color-ink-soft)',
          faint: 'var(--color-ink-faint)',
        },
        line: {
          DEFAULT: 'var(--color-line)',
          soft: 'var(--color-line-soft)',
        },
        paper: 'var(--color-paper)',
        surface: 'var(--color-surface)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        hover: 'var(--shadow-hover)',
        soft: 'var(--shadow-soft)',
      },
      transitionDuration: {
        fast: 'var(--duration-fast)',
        base: 'var(--duration-base)',
        modal: 'var(--duration-modal)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
      },
    },
  },
  plugins: [],
});
