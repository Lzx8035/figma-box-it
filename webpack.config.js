const path = require("path");
const ENV = process.env.NODE_ENV;
const fs = require("fs");

const HtmlWebpackPlugin = require("html-webpack-plugin");
const sveltePreprocess = require("svelte-preprocess");

// 自定义插件：内联 JavaScript 代码到 HTML 文件
class InlineSourcePlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tap("InlineSourcePlugin", (compilation) => {
      const uiHtmlPath = path.join(compilation.outputOptions.path, "ui.html");
      const uiJsPath = path.join(compilation.outputOptions.path, "ui.js");

      if (fs.existsSync(uiHtmlPath) && fs.existsSync(uiJsPath)) {
        let htmlContent = fs.readFileSync(uiHtmlPath, "utf8");
        const jsContent = fs.readFileSync(uiJsPath, "utf8");

        // 检查是否已经有内联的 script 标签
        if (htmlContent.includes('<script src="ui.js">')) {
          // 替换 script 标签为内联的 JavaScript
          htmlContent = htmlContent.replace(
            /<script src="ui\.js"><\/script>/,
            `<script>${jsContent}</script>`
          );
        } else if (!htmlContent.includes("<script>")) {
          // 如果没有 script 标签，在 body 结束前添加
          htmlContent = htmlContent.replace(
            "</body>",
            `<script>${jsContent}</script></body>`
          );
        }

        fs.writeFileSync(uiHtmlPath, htmlContent);

        // 删除单独的 ui.js 文件
        fs.unlinkSync(uiJsPath);
      }
    });
  }
}

module.exports = {
  mode: ENV,
  devtool: ENV === "development" && "inline-source-map",

  entry: {
    ui: "./src/ui.ts",
    code: "./src/code.ts",
  },

  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },

  module: {
    rules: [
      // TypeScript
      { test: /\.ts?$/, use: "ts-loader", exclude: /node_modules/ },

      // Svelte
      {
        test: /\.svelte?$/,
        use: {
          loader: "svelte-loader",
          options: {
            preprocess: sveltePreprocess(),
          },
        },
        exclude: /node_modules/,
      },

      // SCSS
      {
        test: /\.scss?$/,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },

      // SVG Icons
      {
        test: /\.svg?$/,
        use: {
          loader: "svg-inline-loader",
          options: {
            removeSVGTagAttrs: false,
          },
        },
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/ui.html",
      filename: "ui.html",
      chunks: ["ui"],
      inject: "body",
      scriptLoading: "blocking",
    }),
    new InlineSourcePlugin(),
  ],

  resolve: {
    modules: [path.resolve(__dirname, "src"), "node_modules", __dirname],
    extensions: [".mjs", ".js", ".ts", ".svelte"],
    mainFields: ["svelte", "module", "main"],
  },
};
