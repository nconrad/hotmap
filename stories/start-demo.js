import { useEffect } from '@storybook/client-api';

export const start = (func) => {
  useEffect(func, [])
  return '';
}