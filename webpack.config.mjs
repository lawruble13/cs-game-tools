import path from 'path';
import { fileURLToPath } from 'url';
import CopyPlugin from 'copy-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import WebExtPlugin from 'web-ext-plugin';

export default {
  mode: 'development',
  entry: {
    common: 'jquery',
    content: {
      import: './src/content.js',
      dependOn: 'common'
    },
    injected: {
      import: './src/injected.js',
      dependOn: 'common'
    },
    ["first.injected"]: {
      import: './src/first.injected.js'
    }
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'extension-dist'),
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.s[ac]ss$/i,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, "manifest.json"), to: path.resolve(__dirname, "extension-dist") },
        { from: path.resolve(__dirname, "icons"), to: path.resolve(__dirname, "extension-dist/icons")}
      ]
    }),
    new WebExtPlugin({
      sourceDir: path.resolve(__dirname, 'extension-dist'),
      devTools: true,
      startUrl: "https://www.choiceofgames.com/royal-affairs/",
      target: "firefox-desktop",
      buildPackage: true
    }),
  ],
};
