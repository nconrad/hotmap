const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


module.exports = {
    watch: true,
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
            test: /\.less$/,
            loaders: ['style-loader', 'css-loader', 'less-loader']
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
                        drop_console: true
                    }
                }
            })
        ]
    },
    plugins: [
        new webpack.optimize.LimitChunkCountPlugin({
            maxChunks: 1
        }),
        /*
        new CopyWebpackPlugin([{
            from: 'src/heatmap.css',
            to: 'heatmap.css'
        }])
        */
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
