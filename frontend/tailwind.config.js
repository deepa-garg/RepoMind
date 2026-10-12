/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Theme tokens mapping
        theme: {
          bg: 'var(--bg)',
          surface: 'var(--surface)',
          subtle: 'var(--surface-subtle)',
          hover: 'var(--surface-subtle)',
          border: 'var(--border)',
          'border-strong': 'var(--border)',
          primary: 'var(--text)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          accent: 'var(--accent)',
          'accent-hover': 'var(--accent-hover)',
          'accent-foreground': 'var(--accent-foreground)',
          'accent-tint': 'var(--accent-tint)',
          track: 'var(--track)',
          success: 'var(--success)',
          info: 'var(--info)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          purple: 'var(--purple)',
        },
        // Generic tokens
        surface: 'var(--surface)',
        card: 'var(--surface)',
        background: 'var(--bg)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-foreground': 'var(--accent-foreground)',
        popover: 'var(--surface)',
        border: 'var(--border)',
        foreground: 'var(--text)',
        track: 'var(--track)',
        // Backward-compatible dark palette
        dark: {
          950: 'var(--bg)',
          900: 'var(--surface)',
          850: 'var(--surface-subtle)',
          800: 'var(--surface-subtle)',
          750: 'var(--border)',
          700: 'var(--border)',
          600: 'var(--text-muted)',
          500: 'var(--text-muted)',
          400: 'var(--text-secondary)',
          300: 'var(--text)',
          200: 'var(--text)',
          100: 'var(--text)',
        },
        brand: {
          50: '#F0F7F3',
          100: '#E1EFE7',
          200: '#C3DFD0',
          300: '#28784F',
          400: 'var(--accent)',
          500: 'var(--accent)',
          600: 'var(--accent-hover)',
          700: '#1B5E3F',
        }
      },
      fontFamily: {
        serif: ['Newsreader', 'Source Serif 4', 'Georgia', 'Cambria', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        btn: '10px',
      },
      boxShadow: {
        subtle: 'var(--shadow-subtle)',
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
      }
    },
  },
  plugins: [],
}
