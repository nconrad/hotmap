const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const WebpackAutoInject = require('webpack-auto-inject-version');

const devMode = process.env.NODE_ENV !== 'production';


module.exports = {
    mode: 'development',
    entry: {
        'heatmap': './entry.js',
        'app': ['./demo/app.js']
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/dist/',
        filename: '[name].js',
        library: 'Heatmap',
        libraryTarget: 'umd'
    },
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            exclude: /node_modules/
        }, {
            test: /\.html$/,
            loader: 'html-loader',
            exclude: /node_modules/
        }, {
            test: /\.(less)$/,
            use: [
                devMode ? 'style-loader' : MiniCssExtractPlugin.loader,
                'css-loader',
                'less-loader'
            ]
        }, {
            test: /\.svg$/,
            loader: 'svg-inline-loader'
        }]
    },
    optimization: {
        minimizer: [
            new UglifyJSPlugin({
                uglifyOptions: {
                    compress: {
                        drop_console: false
                    }
                }
            })
        ]
    },
    plugins: [
        new WebpackAutoInject(),
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        new MiniCssExtractPlugin({
            filename: '[name].css'
        })
    ],
    stats: {
        colors: true
    },
    devtool: 'source-map',
    devServer: {
        publicPath: '/dist/',
        port: 9000
    },
    performance: {
        hints: false
    }
};
