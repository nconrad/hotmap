import { configure } from '@storybook/html';

const loaderFn = () => {
  const allExports = [require('../stories/gettingStarted.stories.js')];
  const req = require.context('../stories', true, /\.stories\.js$/);
  req.keys().forEach(fname => allExports.push(req(fname)));
  return allExports;
};

configure(loaderFn, module);