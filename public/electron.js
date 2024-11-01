const { app, BrowserWindow, session } = require('electron');
const path = require('path');

const createWindow = () => {
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: 1100,
		height: 750,
		minWidth: 715,
		minHeight: 700,
		resizable: true,
		backgroundColor: '#1f1f1f',
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false,
			enableRemoteModule: true
		}
	});

	session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
		if (permission === 'media' || permission === 'mediaAudioVideo') {
			callback(true);
		} else {
			callback(false);
		}
	});

	mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.on('ready', () => {
	createWindow()

	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0)
			createWindow()
	})
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit()
})