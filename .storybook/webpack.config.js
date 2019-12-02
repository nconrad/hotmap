const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const devMode = process.env.NODE_ENV !== 'production';

module.exports = function({ config }) {

  // remove svg from existing rule
  config.module.rules = config.module.rules.map(rule => {
    console.log('rule for:', rule)
    if (
      String(rule.test) ===
      String(/\.(svg|ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/)
    ) {
      return {
        ...rule,
        test: /\.(ico|jpg|jpeg|png|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|pdf)(\?.*)?$/,
      }
    }

    if (String(rule.test) === String(/\.html$/)) {
      return {
        test: /\.html$/,
        loader: 'html-loader',
        options: {
            interpolate: true
        }
      }
    }

    return rule
  })


  config.module.rules = config.module.rules.concat([
    {
      test: /\.(scss)$/,
      use: [
          devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
          'css-loader',
          'sass-loader'
      ]
    },
    {
      test: /\.(svg)$/,
      loader: 'svg-inline-loader'
    },
    {
      test: /\.stories\.js?$/,
      loaders: [require.resolve('@storybook/source-loader')],
      enforce: 'pre'
    }
  ])

  return config
}