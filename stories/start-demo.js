import { useEffect } from '@storybook/client-api';

export const start = (demo) => {
  useEffect(() => {
    demo();

    return () => {
      document.getElementById('chart').remove()
      const chart = document.createElement('div');
      chart.setAttribute('id', 'chart');
      document.querySelector('body').appendChild(chart);
    }
  }, [])

  return '';
}