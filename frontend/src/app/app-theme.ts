import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * TCV brand preset, built on PrimeNG's Aura design language.
 * Primary scale is anchored on the existing brand accent (#4154f1)
 * so PrimeNG components read consistently with the Material shell.
 */
export const TcvPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '#eef1ff',
      100: '#e0e4fe',
      200: '#c7ccfd',
      300: '#a5abfa',
      400: '#7c7ff5',
      500: '#4154f1',
      600: '#3141d6',
      700: '#2732ab',
      800: '#212986',
      900: '#1c2569',
      950: '#12163f',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.400}',
      offset: '1px',
    },
    colorScheme: {
      light: {
        surface: {
          0: '#ffffff',
          50: '#f7f8fc',
          100: '#eef1f8',
          200: '#dfe4ef',
          300: '#c8cfe0',
          400: '#a6afc9',
          500: '#7d89ab',
          600: '#5e6a8c',
          700: '#475273',
          800: '#333c58',
          900: '#1e2438',
          950: '#12162a',
        },
        primary: {
          color: '{primary.500}',
          contrastColor: '#ffffff',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}',
        },
        highlight: {
          background: '{primary.50}',
          focusBackground: '{primary.100}',
          color: '{primary.700}',
          focusColor: '{primary.700}',
        },
      },
    },
  },
});
