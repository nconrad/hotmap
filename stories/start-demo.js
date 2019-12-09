import { useEffect } from '@storybook/client-api';

export const start = (demo, tearDown) => {
  useEffect(() => {
    demo();

    return () => {
      if (tearDown) tearDown();

      document.getElementById('chart').remove()
      const chart = document.createElement('div');
      chart.setAttribute('id', 'chart');
      document.querySelector('body').appendChild(chart);
    }
  }, [])

  return '';
}
