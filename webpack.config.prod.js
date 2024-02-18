const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'src', 'index.js'),
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Interactivity in WASM',
            template: path.resolve(__dirname, 'src', 'index.html'),
        }),
        new CopyPlugin({
            patterns: [
                { from: path.resolve(__dirname, 'gostuff', 'bin', 'main.wasm'), to: "main.wasm" },
            ],
        }),
    ],
    output: {
        clean: true,
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ],
    },
};