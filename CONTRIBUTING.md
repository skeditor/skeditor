## Setup

Make sure to install the dependencies

```bash
npm install
npm link-dep ## if you use local canvaskit
```

本地开发时可以指定一个存放 sketch 文件的目录。
创建 .env 文件并添加一行:

```bash
SKETCH_DIRS=path/to/your/sketch-files/
```

## Development

Start the development server on http://localhost:3000

```bash
npm run dev
```

## Production

Build the application for production:

```bash
npm run build
```
