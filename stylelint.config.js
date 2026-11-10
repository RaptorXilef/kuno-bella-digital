/**
 * Path: stylelint.config.js
 * @description Spezialisierte SCSS-Qualitätssicherung.
 */

export default {
  extends: ['stylelint-config-standard-scss', 'stylelint-config-recess-order'],
  plugins: ['stylelint-declaration-strict-value'],
  rules: {
    'alpha-value-notation': 'number',
    'no-empty-source': null,
    'scss/at-rule-no-unknown': true,
    'number-max-precision': 5,
    'color-no-hex': [true, { message: 'Nutze oklch() oder CSS-Variablen statt HEX-Farben für moderne Themes.' }],
    'max-nesting-depth': [3, { ignorePseudoClasses: ['hover', 'focus', 'active', 'focus-visible'] }],
    'scale-unlimited/declaration-strict-value': [
      ['/^color$/', '/-color$/', 'font-family', 'font-size', 'font-weight', 'spacing'],
      {
        ignoreValues: [
          '0',
          'inherit',
          'transparent',
          'initial',
          'none',
          'currentColor',
          'sans-serif',
          'arial',
          'monospace',
          '/^\\d+(%|vw|vh|rem|em)$/',
        ],
        disableFix: true,
        severity: 'warning',
        message: 'Hinweis: Nutze eine Variable statt eines hart-codierten Wertes.',
      },
    ],
    'selector-class-pattern': [
      '^(c|o|u|l|s|is|has)-([a-z][a-z0-9]*)(-[a-z0-9]+)*(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$',
      { message: 'Klassennamen müssen das Namespace-BEM-Muster nutzen (z.B. .c-card__title, .l-layout)' },
    ],
  },
  ignoreFiles: ['**/_palette.scss', 'vendor/**/*.scss', 'public/dist/**/*.css'],
};
