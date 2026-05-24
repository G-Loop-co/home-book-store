const { app, BrowserWindow, Menu, shell } = require("electron");
const http = require("node:http");
const path = require("node:path");
const next = require("next");

const PORT = Number(process.env.BOOK_STORE_DESKTOP_PORT || 31230);
let server;
let mainWindow;

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

function configureRuntimePaths() {
  const userData = app.getPath("userData");
  const dataDir = process.env.HOME_BOOK_STORE_DATA_DIR || process.env.BOOK_STORE_DATA_DIR || userData;
  const dbPath = process.env.HOME_BOOK_STORE_DB_PATH || process.env.BOOK_STORE_DB_PATH || path.join(userData, "home-book-store.sqlite");
  const uploadDir = process.env.HOME_BOOK_STORE_UPLOAD_DIR || process.env.BOOK_STORE_UPLOAD_DIR || path.join(userData, "uploads");

  process.env.HOME_BOOK_STORE_DATA_DIR ||= dataDir;
  process.env.HOME_BOOK_STORE_DB_PATH ||= dbPath;
  process.env.HOME_BOOK_STORE_UPLOAD_DIR ||= uploadDir;
  process.env.BOOK_STORE_DATA_DIR ||= dataDir;
  process.env.BOOK_STORE_DB_PATH ||= dbPath;
  process.env.BOOK_STORE_UPLOAD_DIR ||= uploadDir;
}

async function startNextServer() {
  if (server) {
    return;
  }

  const nextApp = next({
    dev: !app.isPackaged,
    dir: app.getAppPath(),
    hostname: "127.0.0.1",
    port: PORT
  });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  server = http.createServer((request, response) => {
    handle(request, response);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "127.0.0.1", () => resolve());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    minWidth: 980,
    minHeight: 700,
    title: "Home Book Store",
    backgroundColor: "#f7f4ef",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  app.setAppUserModelId("local.home-book-store");
  configureRuntimePaths();
  Menu.setApplicationMenu(null);
  await startNextServer();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("second-instance", () => {
  if (!mainWindow) {
    createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.focus();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  server?.close();
});
