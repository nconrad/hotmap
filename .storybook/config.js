import { configure } from '@storybook/html';

configure(require.context('../stories', true, /\.stories\.js$/), module);
