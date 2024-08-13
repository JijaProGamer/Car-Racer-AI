import path from 'node:path';
import { fileURLToPath } from 'node:url';
    
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default () => {
  return {
    mode: "development",
    //devtool: false,
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'main.js',
    },
    module: {
      rules: []
    },
    plugins: [],
  };
};