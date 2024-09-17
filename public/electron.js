const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const NODE_ENV = 'development';

app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-running-insecure-content');

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1100,
		height: 750,
		minWidth: 715,
		minHeight: 700,
		resizable: true,
		backgroundColor: '#1f1f1f',
		frame: true, // removes the frame from the BrowserWindow. It is advised that you either create a custom menu bar or remove this line
		webPreferences: {
			devTools: true, // toggles whether devtools are available. to use node write window.require('<node-name>')
			nodeIntegration: false, // turn this off if you don't mean to use node,
			enableRemoteModule: false,
			contextIsolation: true,
			webSecurity: false,
			allowRunningInsecureContent: true,
		}
	});

	session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
		if (permission === 'media') {
			callback(true); // Permitir sempre acesso a mídia
		} else {
			callback(false);
		}
	});

	// // load the index.html of the app. (or localhost on port 3000 if you're in development)
	if (NODE_ENV === 'development') {
		mainWindow.loadURL('http://localhost:3000');
		mainWindow.webContents.openDevTools(); // Abre as DevTools no modo de desenvolvimento
	} else {
		mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
	}
	// Open the DevTools. will only work if webPreferences::devTools is true
	// mainWindow.webContents.openDevTools()
}

app.on('ready', () => {
	createWindow()

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0)
			createWindow()
	})
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})