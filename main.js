require('events').setMaxListeners(25);
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const Store = require('electron-store');
const { Client } = require('minecraft-launcher-core');
const { Auth } = require('msmc');
const fs = require('fs-extra');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');
const { exec } = require('child_process');

async function withRetry(fn, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === retries - 1) throw err;
            await new Promise(res => setTimeout(res, delay));
            delay *= 2;
        }
    }
}

function findJavaPath() {
    if (process.platform !== 'win32') return null;

    const commonPaths = [
        'C:\\Program Files\\Java',
        'C:\\Program Files\\Eclipse Adoptium',
        'C:\\Program Files\\Eclipse Foundation',
        'C:\\Program Files\\Temurin',
        'C:\\Program Files\\AdoptOpenJDK',
        'C:\\Program Files (x86)\\Java',
        'C:\\Program Files (x86)\\Eclipse Adoptium'
    ];

    for (const basePath of commonPaths) {
        if (!fs.existsSync(basePath)) continue;

        try {
            const dirs = fs.readdirSync(basePath);
            // Sort to prefer newer versions (e.g., jdk-21 over jdk-17)
            const sortedDirs = dirs.sort().reverse();

            for (const dir of sortedDirs) {
                const javaPath = path.join(basePath, dir, 'bin', 'java.exe');
                if (fs.existsSync(javaPath)) {
                    return javaPath;
                }
            }
        } catch (err) {

        }
    }


    return null;
}

function isJavaInstalled() {
    return findJavaPath() !== null;
}

async function downloadJava() {
    const tempDir = path.join(os.tmpdir(), 'java-download');
    const javaInstallDir = 'C:\\Program Files\\Temurin';
    
    try {
        fs.ensureDirSync(tempDir);
        
        const downloadUrl = 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.1%2B12/OpenJDK21U-jdk_x64_windows_hotspot_21.0.1_12.zip';
        
        const fileName = 'java-21.zip';
        const filePath = path.join(tempDir, fileName);
        
        if (mainWindow) {
            mainWindow.webContents.send('java-download-progress', { status: 'downloading', progress: 0, message: 'Starting download...' });
        }
        
        const response = await fetch(downloadUrl);
        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        
        const totalSize = parseInt(response.headers.get('content-length') || '0', 10);
        let downloadedSize = 0;
        
        const { Writable } = require('stream');
        const writeStream = fs.createWriteStream(filePath);
        
        response.body.on('data', (chunk) => {
            downloadedSize += chunk.length;
            const progress = totalSize > 0 ? Math.round((downloadedSize / totalSize) * 50) : 0;
            if (mainWindow) {
                mainWindow.webContents.send('java-download-progress', { 
                    status: 'downloading', 
                    progress, 
                    message: `Downloaded: ${Math.round(downloadedSize / 1024 / 1024)}MB` 
                });
            }
        });

        await new Promise((resolve, reject) => {
            response.body.pipe(writeStream);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
            response.body.on('error', reject);
        });
        
        if (mainWindow) {
            mainWindow.webContents.send('java-download-progress', { status: 'extracting', progress: 50, message: 'Extracting files...' });
        }
        
        const zip = new AdmZip(filePath);
        fs.ensureDirSync(javaInstallDir);
        
        const extractedDir = path.join(tempDir, 'java-extracted');
        zip.extractAllTo(extractedDir, true);
        
        const extractedDirs = fs.readdirSync(extractedDir);
        if (extractedDirs.length === 0) {
            throw new Error('Failed to extract Java');
        }
        
        const jdkDir = extractedDirs[0];
        const sourcePath = path.join(extractedDir, jdkDir);
        const destPath = path.join(javaInstallDir, jdkDir);
        
        if (fs.existsSync(destPath)) {
            fs.removeSync(destPath);
        }
        
        fs.moveSync(sourcePath, destPath);
        
        if (mainWindow) {
            mainWindow.webContents.send('java-download-progress', { status: 'completed', progress: 100, message: 'Java installed successfully!' });
        }
        
        setTimeout(() => {
            try {
                fs.removeSync(tempDir);
            } catch (e) {
                console.error('Error cleaning up temp files:', e);
            }
        }, 1000);
        
        return true;
    } catch (error) {
        console.error('Error downloading Java:', error);
        if (mainWindow) {
            mainWindow.webContents.send('java-download-progress', { status: 'error', error: error.message });
        }
        return false;
    }
}



const store = new Store({
    defaults: {
        settings: {
            theme: 'dark',
            language: 'ru',
            gamePath: path.join(app.getPath('appData'), '.minecraft'),
            javaArgs: '',
            minMemory: 2048,
            maxMemory: 4096
        },
        accounts: [],
        selectedAccount: null
    }
});

let localeStrings = {};

function loadLocaleStrings() {
    const settings = store.get('settings');
    const lang = settings.language || 'ru';
    const localeFile = path.join(__dirname, 'src', 'locales', `${lang}.json`);
    
    try {
        if (fs.existsSync(localeFile)) {
            localeStrings = JSON.parse(fs.readFileSync(localeFile, 'utf-8'));
        }
    } catch (err) {
        console.error('Error loading locale file:', err);
        localeStrings = {};
    }
}

function t(key) {
    const keys = key.split('.');
    let value = localeStrings;
    
    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            return key;
        }
    }
    
    return value;
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 750,
        minWidth: 900,
        minHeight: 600,
        frame: false,
        transparent: false,
        backgroundColor: '#1a1a2e',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon.png')
    });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    loadLocaleStrings();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});

ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        await shell.openPath(folderPath);
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('select-icon', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'ico'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, path: result.filePaths[0] };
    }
    return { success: false };
});

ipcMain.handle('check-java', async () => {
    return { installed: isJavaInstalled() };
});

ipcMain.handle('ask-download-java', async () => {
    const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['Download', 'Cancel'],
        title: 'Java Not Found',
        message: 'Java is not installed on your system.',
        detail: 'Minecraft requires Java to run. Would you like to download and install Java 21 automatically?',
        defaultId: 0,
        cancelId: 1
    });

    return { downloadConfirmed: result.response === 0 };
});

ipcMain.handle('download-java', async () => {
    const success = await downloadJava();
    return { success };
});

ipcMain.handle('save-profile', async (event, profile) => {
    const settings = store.get('settings');
    const profiles = settings.profiles || [];
    profiles.push(profile);
    store.set('settings.profiles', profiles);
    store.set('settings.lastProfileIndex', profiles.length - 1);
    return true;
});

ipcMain.handle('delete-profile', async (event, index) => {
    const settings = store.get('settings');
    const profiles = settings.profiles || [];

    if (index >= 0 && index < profiles.length) {
        const profile = profiles[index];
        const fs = require('fs');


        try {
            let versionId;
            if (profile.modloader === 'vanilla') {
                versionId = profile.version;
            } else if (profile.modloader === 'forge') {
                versionId = `${profile.version}-forge-${profile.modloaderVersion}`;
            } else if (profile.modloader === 'fabric') {
                versionId = `fabric-loader-${profile.modloaderVersion}-${profile.version}`;
            }

            if (versionId) {
                const versionDir = path.join(settings.gamePath, 'versions', versionId);
                if (fs.existsSync(versionDir)) {
                    fs.rmSync(versionDir, { recursive: true, force: true });
                }
            }

            if (profile.gamePath && profile.gamePath !== settings.gamePath) {
                if (fs.existsSync(profile.gamePath)) {
                    fs.rmSync(profile.gamePath, { recursive: true, force: true });
                }
            } else {
                const cleanName = profile.name.replace(/[^a-zA-Z0-9 -]/g, "").trim();
                const potentialModpackPath = path.join(settings.gamePath, 'modpacks', cleanName);
                if (fs.existsSync(potentialModpackPath)) {
                    fs.rmSync(potentialModpackPath, { recursive: true, force: true });
                }
            }
        } catch (fsErr) {
            // Silently fail
        }

        profiles.splice(index, 1);
        store.set('settings.profiles', profiles);

        let lastIndex = store.get('settings.lastProfileIndex') || 0;
        if (lastIndex >= index) {
            lastIndex = Math.max(0, lastIndex - 1);
            store.set('settings.lastProfileIndex', lastIndex);
        }

        if (profiles.length === 0) {
            store.set('settings.lastProfileIndex', 0);
        }

        return true;
    }
    return false;
});

ipcMain.handle('save-last-profile-index', async (event, index) => {
    store.set('settings.lastProfileIndex', index);
    return true;
});

const CF_API_KEY = '$2a$10$bL4bIL5pUWqfcO7KQtnMReakwtfHbNKh6v1uTpKlzhwoueEJQnPnm';
ipcMain.handle('search-modpacks', async (event, { query, platform, sort, offset = 0 }) => {
    try {
        const fetch = require('node-fetch');

        if (platform === 'modrinth') {
            const index = sort || 'relevance';
            const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=[["project_type:modpack"]]&index=${index}&limit=20&offset=${offset}`;
            const response = await fetch(url);
            const data = await response.json();

            return data.hits.map(hit => ({
                id: hit.project_id,
                slug: hit.slug,
                title: hit.title,
                author: hit.author,
                description: hit.description,
                thumbnail: hit.icon_url,
                downloads: hit.downloads,
                follows: hit.follows,
                latestVersion: hit.latest_version,
                platform: 'modrinth'
            }));
        } else {
            let sortField = 2; if (sort === 'downloads') sortField = 6;
            if (sort === 'newest') sortField = 3;

            const url = `https://api.curseforge.com/v1/mods/search?gameId=432&classId=4471&searchFilter=${encodeURIComponent(query)}&sortField=${sortField}&sortOrder=desc&pageSize=20&index=${offset}`;

            const response = await fetch(url, {
                headers: {
                    'x-api-key': CF_API_KEY,
                    'Accept': 'application/json',
                    'User-Agent': 'WTFLauncher/1.0'
                }
            });

            if (!response.ok) {
                return [];
            }
            const data = await response.json();

            return data.data.map(mod => ({
                id: mod.id,
                title: mod.name,
                author: mod.authors[0]?.name || 'Unknown',
                description: mod.summary,
                thumbnail: mod.logo?.url || mod.attachments?.[0]?.url || '',
                downloads: mod.downloadCount,
                platform: 'curseforge',
                websiteUrl: mod.links.websiteUrl
            }));
        }
    } catch (err) {
        return [];
    }
});

ipcMain.handle('get-modpack-versions', async (event, { id, platform }) => {
    try {
        const fetch = require('node-fetch');
        if (platform === 'modrinth') {
            const MAX_RETRIES = 5;
            let response;
            let lastError;

            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    if (i > 0) {
                        const delay = 300 * Math.pow(2, i - 1);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }

                    response = await fetch(`https://api.modrinth.com/v2/project/${id}/version`, {
                        headers: {
                            'User-Agent': 'WTFLauncher/1.0 (launcher@example.com)'
                        }
                    });

                    if (response.ok) break;

                    if (response.status === 404) break;
                } catch (netErr) {
                    lastError = netErr.message;
                }
            }

            if (!response || !response.ok) {
                return [];
            }

            const data = await response.json();
            return data.map(v => ({
                id: v.id,
                name: v.name,
                version_number: v.version_number,
                mc_versions: v.game_versions,
                loaders: v.loaders,
                type: v.version_type,
                date: v.date_published
            }));
        } else {
            const response = await fetch(`https://api.curseforge.com/v1/mods/${id}/files`, {
                headers: { 'x-api-key': CF_API_KEY }
            });
            const data = await response.json();
            return data.data.map(f => ({
                id: f.id,
                name: f.displayName,
                version_number: f.fileName,
                mc_versions: f.gameVersions,
                loaders: [],
                type: f.releaseType === 1 ? 'release' : 'beta',
                date: f.fileDate
            }));
        }
    } catch (err) {
        return [];
    }
});

ipcMain.handle('search-mods', async (event, { query, platform, sort, type, offset = 0 }) => {
    try {
        const fetch = require('node-fetch');
        const isResourcePack = type === 'resourcepack';

        if (platform === 'curseforge') {
            let sortField = 2; if (sort === 'downloads') sortField = 6;
            if (sort === 'newest') sortField = 3;

            const classId = isResourcePack ? 12 : 6;
            const url = `https://api.curseforge.com/v1/mods/search?gameId=432&classId=${classId}&searchFilter=${encodeURIComponent(query)}&sortField=${sortField}&sortOrder=desc&pageSize=20&index=${offset}`;

            const response = await fetch(url, {
                headers: {
                    'x-api-key': CF_API_KEY,
                    'Accept': 'application/json',
                    'User-Agent': 'WTFLauncher/1.0'
                }
            });

            if (!response.ok) return [];
            const data = await response.json();

            const filteredData = data.data.filter(mod => {
                const name = mod.name.toLowerCase();
                const summary = (mod.summary || '').toLowerCase();
                const isXray = (name.includes('xray') || name.includes('x-ray')) && (name.includes('ultimate') || name.includes('reloaded') || name.includes('pack'));
                const isXrayId = [268615, 608933, 442340].includes(mod.id); return !(isXray || isXrayId);
            });

            return filteredData.map(mod => ({
                id: mod.id,
                title: mod.name,
                author: mod.authors[0]?.name || 'Unknown',
                description: mod.summary,
                thumbnail: mod.logo?.url || mod.attachments?.[0]?.url || '',
                downloads: mod.downloadCount,
                categories: mod.categories.map(c => c.name),
                platform: 'curseforge',
                latestVersion: '', websiteUrl: mod.links.websiteUrl
            }));
        } else {
            const index = sort || 'relevance';
            const projectType = isResourcePack ? 'resourcepack' : 'mod';
            const facets = JSON.stringify([[`project_type:${projectType}`]]);
            const url = `https://api.modrinth.com/v2/search?query=${encodeURIComponent(query)}&facets=${encodeURIComponent(facets)}&index=${index}&limit=30&offset=${offset}`;

            const response = await fetch(url, {
                headers: { 'User-Agent': 'WTFLauncher/1.0' }
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            const filteredHits = data.hits.filter(hit => {
                const title = hit.title.toLowerCase();
                const description = (hit.description || '').toLowerCase();
                const isXray = (title.includes('xray') || title.includes('x-ray')) && (title.includes('ultimate') || title.includes('reloaded') || title.includes('pack'));
                return !isXray;
            });

            return filteredHits.map(hit => ({
                id: hit.project_id,
                slug: hit.slug,
                title: hit.title,
                author: hit.author,
                description: hit.description,
                thumbnail: hit.icon_url || '',
                downloads: hit.downloads,
                categories: hit.categories || [],
                platform: 'modrinth',
                latestVersion: hit.latest_version
            }));
        }
    } catch (err) {
        return [];
    }
});

ipcMain.handle('get-mod-versions', async (event, { id, platform }) => {
    try {
        const fetch = require('node-fetch');

        if (platform === 'curseforge') {
            const response = await fetch(`https://api.curseforge.com/v1/mods/${id}/files`, {
                headers: { 'x-api-key': CF_API_KEY }
            });
            if (!response.ok) return [];
            const data = await response.json();

            return data.data.map(f => ({
                id: f.id,
                name: f.displayName,
                version_number: f.fileName,
                mc_versions: f.gameVersions,
                loaders: [], type: f.releaseType === 1 ? 'release' : (f.releaseType === 2 ? 'beta' : 'alpha'),
                date: f.fileDate,
                files: [{
                    url: f.downloadUrl,
                    filename: f.fileName,
                    primary: true
                }]
            }));

        } else {
            const response = await fetch(`https://api.modrinth.com/v2/project/${id}/version`, {
                headers: { 'User-Agent': 'WTFLauncher/1.0' }
            });

            if (!response.ok) return [];

            const data = await response.json();
            return data.map(v => ({
                id: v.id,
                name: v.name,
                version_number: v.version_number,
                mc_versions: v.game_versions,
                loaders: v.loaders,
                type: v.version_type,
                date: v.date_published,
                files: v.files
            }));
        }
    } catch (err) {
        return [];
    }
});

ipcMain.handle('download-mod', async (event, { modId, versionId, fileName, downloadUrl, type }) => {
    const fetch = require('node-fetch');
    const settings = store.get('settings');

    try {
        mainWindow.webContents.send('launch-progress', { task: `Downloading ${fileName}...`, total: 100 });

        const folderName = type === 'resourcepack' ? 'resourcepacks' : 'mods';
        const targetPath = path.join(settings.gamePath, folderName);
        if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

        const response = await fetch(downloadUrl, {
            headers: { 'User-Agent': 'WTFLauncher/1.0' }
        });

        if (!response.ok) throw new Error(`Download failed: ${response.status}`);

        const buffer = await response.buffer();
        const filePath = path.join(targetPath, fileName);
        fs.writeFileSync(filePath, buffer);

        mainWindow.webContents.send('launch-progress', { task: 'Mod downloaded!', total: 100, current: 100 });

        return { success: true, path: filePath };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('install-modpack', async (event, { id, platform, versionId }) => {
    const fetch = require('node-fetch');
    const AdmZip = require('adm-zip');
    const settings = store.get('settings');

    try {
        mainWindow.webContents.send('launch-progress', { task: 'Initializing modpack installation...', total: 100 });

        let manifest = null;
        let modpackZipBuffer = null;
        let modpackName = "Modpack";

        const timestamp = Date.now();
        const instanceId = `modpack_${id}_${timestamp}`;
        const instancePath = path.join(settings.gamePath, 'modpacks', instanceId);
        if (!fs.existsSync(instancePath)) fs.mkdirSync(instancePath, { recursive: true });

        if (platform === 'modrinth') {
            mainWindow.webContents.send('launch-progress', { task: 'Fetching modpack version info...', total: 10 });

            let targetVersion;
            try {
                if (versionId) {
                    const verRes = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
                    if (!verRes.ok) throw new Error(`Modrinth API error: ${verRes.status}`);
                    const text = await verRes.text();
                    try {
                        targetVersion = JSON.parse(text);
                    } catch (e) {
                        throw new Error(`Failed to parse Modrinth version response: ${text.substring(0, 100)}...`);
                    }
                } else {
                    const versRes = await fetch(`https://api.modrinth.com/v2/project/${id}/version`);
                    if (!versRes.ok) throw new Error(`Modrinth API error: ${versRes.status}`);
                    const text = await versRes.text();
                    try {
                        const versions = JSON.parse(text);
                        targetVersion = versions[0];
                    } catch (e) {
                        throw new Error(`Failed to parse Modrinth versions list: ${text.substring(0, 100)}...`);
                    }
                }
            } catch (err) {
                throw err;
            }

            if (!targetVersion) throw new Error("Modpack version not found.");

            const file = targetVersion.files.find(f => f.primary) || targetVersion.files[0];
            mainWindow.webContents.send('launch-progress', { task: 'Downloading modpack archive...', total: 30 });

            const zipResponse = await fetch(file.url);
            modpackZipBuffer = await zipResponse.buffer();

            const zip = new AdmZip(modpackZipBuffer);
            const indexEntry = zip.getEntry('modrinth.index.json');
            if (!indexEntry) throw new Error("Invalid .mrpack");

            manifest = JSON.parse(indexEntry.getData().toString('utf8'));
            modpackName = manifest.name || targetVersion.name;

            const mcVer = manifest.dependencies.minecraft;

            let loaderType = 'vanilla';
            let loaderVer = null;

            if (manifest.dependencies['fabric-loader']) {
                loaderType = 'fabric';
                loaderVer = manifest.dependencies['fabric-loader'];
            } else if (manifest.dependencies['quilt-loader']) {
                loaderType = 'fabric'; loaderVer = manifest.dependencies['quilt-loader'];
            } else if (manifest.dependencies.forge) {
                loaderType = 'forge';
                loaderVer = manifest.dependencies.forge;
            } else if (manifest.dependencies.neoforge) {
                loaderType = 'forge'; loaderVer = manifest.dependencies.neoforge;
            }

            mainWindow.webContents.send('launch-progress', { task: `Preparing Minecraft ${mcVer}...`, total: 50 });
            const vVersionList = await withRetry(() => getVersionList());
            const vMeta = vVersionList.versions.find(v => v.id === mcVer);
            if (vMeta) {
                await install(vMeta, settings.gamePath);
            }

            if (loaderType !== 'vanilla') {
                mainWindow.webContents.send('launch-progress', { task: `Preparing ${loaderType} ${loaderVer}...`, total: 60 });
                if (loaderType === 'forge') {
                    const forgeFullVersion = `${mcVer}-${loaderVer}`;
                    const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`;
                    const forgeInfo = {
                        mcversion: mcVer,
                        version: loaderVer,
                        installer: {
                            url: installerUrl,
                            path: installerUrl
                        }
                    };
                    await withRetry(() => installForge(forgeInfo, settings.gamePath));
                } else if (loaderType === 'fabric') {
                    try {
                        await installFabricManual(mcVer, loaderVer, settings.gamePath);
                    } catch (fabricErr) {
                        mainWindow.webContents.send('launch-progress', { task: 'Finding compatible Fabric version...', total: 60 });

                        const fabricResponse = await withRetry(() => fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVer}`));
                        if (!fabricResponse.ok) {
                            throw new Error(`Fabric API error: ${fabricResponse.status}. Original: ${fabricErr.message}`);
                        }
                        const fabricLoaders = await fabricResponse.json();

                        if (fabricLoaders.length === 0) {
                            throw new Error(`No Fabric loaders for MC ${mcVer}. Original: ${fabricErr.message}`);
                        }

                        const latestLoader = fabricLoaders[0].loader.version;
                        mainWindow.webContents.send('launch-progress', { task: `Installing Fabric ${latestLoader}...`, total: 65 });

                        await installFabricManual(mcVer, latestLoader, settings.gamePath);
                        loaderVer = latestLoader;
                    }
                }

            }

            mainWindow.webContents.send('launch-progress', { task: 'Downloading modpack files...', total: 80 });
            const files = manifest.files;
            for (let i = 0; i < files.length; i++) {
                const modFile = files[i];
                mainWindow.webContents.send('launch-progress', {
                    task: `Downloading mod ${i + 1}/${files.length}`,
                    total: 80 + (i / files.length) * 15
                });

                const modResponse = await fetch(modFile.downloads[0]);
                const modBuffer = await modResponse.buffer();
                const destPath = path.join(instancePath, modFile.path);

                fs.mkdirSync(path.dirname(destPath), { recursive: true });
                fs.writeFileSync(destPath, modBuffer);
            }

            const overridesEntry = zip.getEntry('overrides/');
            if (overridesEntry) {
                mainWindow.webContents.send('launch-progress', { task: 'Extracting overrides...', total: 95 });
                zip.extractEntryTo('overrides/', instancePath, false, true);
            }

            const profile = {
                name: modpackName,
                version: mcVer,
                versionType: 'release',
                modloader: loaderType,
                modloaderVersion: loaderVer,
                gamePath: instancePath,
                modCount: manifest.files.length, created: Date.now()
            };

            const profiles = store.get('settings.profiles') || [];
            profiles.push(profile);
            store.set('settings.profiles', profiles);
            store.set('settings.lastProfileIndex', profiles.length - 1);

            mainWindow.webContents.send('launch-progress', { task: 'Installation complete!', total: 100 });
            return { success: true, profile };

        } else if (platform === 'curseforge') {
            mainWindow.webContents.send('launch-progress', { task: 'Fetching file info...', total: 10 });

            let targetFile;
            if (versionId) {
                const fRes = await fetch(`https://api.curseforge.com/v1/mods/${id}/files/${versionId}`, {
                    headers: { 'x-api-key': CF_API_KEY }
                });
                const fData = await fRes.json();
                targetFile = fData.data;
            } else {
                const fsRes = await fetch(`https://api.curseforge.com/v1/mods/${id}/files`, {
                    headers: { 'x-api-key': CF_API_KEY }
                });
                const fsData = await fsRes.json();
                targetFile = fsData.data.find(f => f.releaseType === 1) || fsData.data[0];
            }

            if (!targetFile) throw new Error("Modpack file not found.");

            mainWindow.webContents.send('launch-progress', { task: 'Downloading ZIP...', total: 30 });
            const zipResponse = await fetch(targetFile.downloadUrl);
            modpackZipBuffer = await zipResponse.buffer();

            const zip = new AdmZip(modpackZipBuffer);
            const manifestEntry = zip.getEntry('manifest.json');
            if (!manifestEntry) throw new Error("Invalid CurseForge ZIP: manifest.json not found");

            manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
            modpackName = manifest.name || targetFile.displayName;

            const mcVer = manifest.minecraft.version;
            const loaderEntry = manifest.minecraft.modLoaders.find(l => l.primary) || manifest.minecraft.modLoaders[0];

            let loaderType = 'vanilla';
            let loaderVer = null;

            if (loaderEntry) {
                if (loaderEntry.id.startsWith('forge')) loaderType = 'forge';
                else if (loaderEntry.id.startsWith('fabric')) loaderType = 'fabric';
                else if (loaderEntry.id.startsWith('neoforge')) loaderType = 'forge';
                loaderVer = loaderEntry.id.split('-').pop();
            }

            mainWindow.webContents.send('launch-progress', { task: `Preparing Minecraft ${mcVer}...`, total: 50 });
            const vVersionList = await withRetry(() => getVersionList());
            const vMeta = vVersionList.versions.find(v => v.id === mcVer);
            if (vMeta) await withRetry(() => install(vMeta, settings.gamePath));

            if (loaderType !== 'vanilla') {
                mainWindow.webContents.send('launch-progress', { task: `Preparing ${loaderType} ${loaderVer}...`, total: 60 });
                if (loaderType === 'forge') {
                    const forgeInfo = {
                        mcversion: mcVer,
                        version: loaderVer,
                        installerUrl: `https://maven.minecraftforge.net/net/minecraftforge/forge/${mcVer}-${loaderVer}/forge-${mcVer}-${loaderVer}-installer.jar`
                    };
                    await withRetry(() => installForge(forgeInfo, settings.gamePath));
                } else if (loaderType === 'fabric') {
                    await installFabricManual(mcVer, loaderVer, settings.gamePath).catch(async (fabricErr) => {
                        const fabricResponse = await withRetry(() => fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVer}`));
                        if (fabricResponse.ok) {
                            const fabricLoaders = await fabricResponse.json();
                            if (fabricLoaders.length > 0) {
                                const latestLoader = fabricLoaders[0].loader.version;
                                await installFabricManual(mcVer, latestLoader, settings.gamePath);
                                loaderVer = latestLoader;
                            }
                        }
                    });
                }
            }

            mainWindow.webContents.send('launch-progress', { task: 'Downloading mods...', total: 80 });
            const modsPath = path.join(instancePath, 'mods');
            if (!fs.existsSync(modsPath)) fs.mkdirSync(modsPath, { recursive: true });

            for (let i = 0; i < manifest.files.length; i++) {
                const modMeta = manifest.files[i];
                mainWindow.webContents.send('launch-progress', {
                    task: `Downloading mod ${i + 1}/${manifest.files.length}`,
                    total: 80 + (i / manifest.files.length) * 15
                });

                const modFileResponse = await fetch(`https://api.curseforge.com/v1/mods/${modMeta.projectID}/files/${modMeta.fileID}`, {
                    headers: { 'x-api-key': CF_API_KEY }
                });
                const modFileData = await modFileResponse.json();
                const dUrl = modFileData.data.downloadUrl;

                if (dUrl) {
                    const modResponse = await fetch(dUrl);
                    const modBuffer = await modResponse.buffer();
                    const destPath = path.join(modsPath, modFileData.data.fileName);
                    fs.writeFileSync(destPath, modBuffer);
                }
            }

            const overridesEntry = zip.getEntry('overrides/');
            if (overridesEntry) {
                const tempExt = path.join(instancePath, '_temp_cf');
                zip.extractEntryTo('overrides/', tempExt, false, true);
                if (fs.existsSync(tempExt)) {
                    fs.copySync(tempExt, instancePath);
                    fs.removeSync(tempExt);
                }
            }

            const profile = {
                name: modpackName,
                version: mcVer,
                versionType: 'release',
                modloader: loaderType,
                modloaderVersion: loaderVer,
                gamePath: instancePath,
                modCount: manifest.files.length, created: Date.now()
            };

            const profiles = store.get('settings.profiles') || [];
            profiles.push(profile);
            store.set('settings.profiles', profiles);
            store.set('settings.lastProfileIndex', profiles.length - 1);

            mainWindow.webContents.send('launch-progress', { task: 'Installation complete!', total: 100 });
            return { success: true, profile };
        }

        return { success: false, error: "Platform not supported yet" };

    } catch (err) {
        return { success: false, error: err.message };
    }
});

async function installFabricManual(mcVer, loaderVer, gamePath) {
    const fetch = require('node-fetch');
    const fs = require('fs-extra');
    const path = require('path');

    const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVer}/${loaderVer}/profile/json`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Fabric meta API error: ${response.status} ${response.statusText}`);
    }

    const versionJson = await response.json();
    const versionId = versionJson.id;
    if (!versionId) throw new Error("Invalid Fabric version JSON: missing id");

    const versionDir = path.join(gamePath, 'versions', versionId);
    await fs.ensureDir(versionDir);

    const versionFile = path.join(versionDir, `${versionId}.json`);
    await fs.writeJson(versionFile, versionJson, { spaces: 2 });
    return versionId;
}

ipcMain.handle('get-settings', () => {
    return store.get('settings');
});

ipcMain.handle('save-settings', (event, settings) => {
    store.set('settings', settings);
    loadLocaleStrings();
    return true;
});

ipcMain.handle('select-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options.title || 'Select File',
        properties: ['openFile'],
        filters: options.filters || []
    });
    if (!result.canceled && result.filePaths.length > 0) {
        return result.filePaths[0];
    }
    return null;
});

ipcMain.handle('get-accounts', () => {
    return store.get('accounts');
});

ipcMain.handle('get-selected-account', () => {
    return store.get('selectedAccount');
});

ipcMain.handle('save-accounts', (event, accounts) => {
    store.set('accounts', accounts);
    return true;
});

ipcMain.handle('select-account', (event, accountId) => {
    store.set('selectedAccount', accountId);
    return true;
});

ipcMain.handle('login-microsoft', async () => {
    try {
        const authManager = new Auth('select_account');
        const xboxManager = await authManager.launch('electron');
        const token = await xboxManager.getMinecraft();
        const mclcAuth = token.mclc();

        const account = {
            id: mclcAuth.uuid,
            name: mclcAuth.name,
            type: 'microsoft',
            accessToken: mclcAuth.access_token,
            clientToken: mclcAuth.client_token,
            refreshToken: xboxManager.save(),
            avatar: `https://mc-heads.net/avatar/${mclcAuth.uuid}/64`
        };

        const accounts = store.get('accounts') || [];
        const existingIndex = accounts.findIndex(a => a.id === account.id);
        if (existingIndex >= 0) {
            accounts[existingIndex] = account;
        } else {
            accounts.push(account);
        }
        store.set('accounts', accounts);
        store.set('selectedAccount', account.id);

        return { success: true, account };
    } catch (error) {
        let errMsg = '';
        if (typeof error === 'string') {
            errMsg = error;
        } else if (error && typeof error === 'object' && error.message) {
            errMsg = error.message;
        } else {
            errMsg = JSON.stringify(error);
        }
        return { success: false, error: errMsg };
    }
});

ipcMain.handle('login-offline', (event, username) => {
    const account = {
        id: `offline_${username.toLowerCase()}`,
        name: username,
        type: 'offline',
        avatar: 'https://mc-heads.net/avatar/MHF_Steve/64'
    };

    const accounts = store.get('accounts') || [];
    const existingIndex = accounts.findIndex(a => a.id === account.id);
    if (existingIndex >= 0) {
        accounts[existingIndex] = account;
    } else {
        accounts.push(account);
    }
    store.set('accounts', accounts);
    store.set('selectedAccount', account.id);

    return { success: true, account };
});

ipcMain.handle('remove-account', (event, accountId) => {
    let accounts = store.get('accounts') || [];
    accounts = accounts.filter(a => a.id !== accountId);
    store.set('accounts', accounts);

    if (store.get('selectedAccount') === accountId) {
        store.set('selectedAccount', accounts.length > 0 ? accounts[0].id : null);
    }

    return true;
});

ipcMain.handle('get-versions', async () => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://launchermeta.mojang.com/mc/game/version_manifest_v2.json');
        const data = await response.json();
        return data.versions;
    } catch (error) {
        return [];
    }
});

ipcMain.handle('get-fabric-versions', async (event, mcVersion) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
        if (!response.ok) return [];
        const data = await response.json();
        return data.map(v => ({
            loader: v.loader.version,
            stable: v.loader.stable
        }));
    } catch (error) {
        return [];
    }
});

ipcMain.handle('get-forge-versions', async (event, mcVersion) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json');
        const data = await response.json();
        const versions = [];

        for (const [key, version] of Object.entries(data.promos)) {
            if (key.startsWith(mcVersion + '-')) {
                const type = key.replace(mcVersion + '-', '');
                versions.push({ version, type });
            }
        }

        return versions.reverse();
    } catch (error) {
        return [];
    }
});

let gameProcess = null;

const { installForge, getForgeVersionList, install, getVersionList } = require('@xmcl/installer');

function getOfflineUUID(username) {
    const crypto = require('crypto');
    const data = "OfflinePlayer:" + username;
    const md5 = crypto.createHash('md5').update(data).digest('hex');
    return md5;
}

ipcMain.handle('install-vanilla-version', async (event, options) => {
    try {
        const settings = store.get('settings');
        const launcher = new Client();

        let versionId = options.version;
        if (options.modloader === 'forge') {
            const forgeId = `${options.version}-forge-${options.modloaderVersion}`;
            if (fs.existsSync(path.join(settings.gamePath, 'versions', forgeId, `${forgeId}.json`))) {
                versionId = forgeId;
            }
        } else if (options.modloader === 'fabric') {
            const fabricId = `fabric-loader-${options.modloaderVersion}-${options.version}`;
            const fabricDir = path.join(settings.gamePath, 'versions', fabricId);
            const fabricJsonPath = path.join(fabricDir, `${fabricId}.json`);

            if (fs.existsSync(fabricJsonPath)) {
                versionId = fabricId;
            } else {
                try {
                    const fetch = require('node-fetch');
                    const url = `https://meta.fabricmc.net/v2/versions/loader/${options.version}/${options.modloaderVersion}/profile/json`;
                    const response = await fetch(url);

                    if (response.ok) {
                        const json = await response.json();
                        json.id = fabricId; // Ensure ID matches folder

                        if (!fs.existsSync(fabricDir)) {
                            fs.mkdirSync(fabricDir, { recursive: true });
                        }

                        fs.writeFileSync(fabricJsonPath, JSON.stringify(json, null, 2));
                        versionId = fabricId;
                        event.sender.send('launch-progress', { task: 'Fabric profile installed', total: 100, current: 100 });
                    } else {
                        // console.error to be avoided, sending error via IPC or throwing
                        throw new Error(`Failed to fetch Fabric profile: ${response.status}`);
                    }
                } catch (e) {
                    throw new Error(`Fabric installation failed: ${e.message}`);
                }
            }
        }

        const launchOptions = {
            authorization: {
                access_token: 'dummy',
                client_token: 'dummy',
                uuid: 'dummy',
                name: 'dummy'
            },
            root: settings.gamePath,
            version: {
                number: versionId,
                type: options.versionType || 'release'
            },
            memory: {
                min: `${settings.minMemory}M`,
                max: `${settings.maxMemory}M`
            },
            customArgs: ['-version']
        };

        launcher.on('error', (e) => {
            event.sender.send('launch-progress', { task: 'Error: ' + e, total: 0 });
        });

        launcher.on('progress', (e) => {
            event.sender.send('launch-progress', {
                type: e.type,
                task: e.task,
                percent: e.percent || Math.round((e.current / e.total) * 100)
            });
        });

        launcher.on('debug', (e) => { });
        launcher.on('data', (e) => { });

        try {
            await launcher.launch(launchOptions);
        } catch (err) {
            // Expected
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('launch-game', async (event, options) => {
    try {
        if (!isJavaInstalled()) {
            const result = await dialog.showMessageBox(mainWindow, {
                type: 'question',
                buttons: [t('modal.save') || 'Download', t('modal.cancel') || 'Cancel'],
                title: t('errors.javaNotFound'),
                message: t('errors.javaNotFoundMessage'),
                detail: t('errors.javaNotFoundDetail'),
                defaultId: 0,
                cancelId: 1
            });

            if (result.response === 0) {
                const success = await downloadJava();
                if (!success) {
                    return { success: false, error: t('errors.javaDownloadFailed') };
                }
            } else {
                return { success: false, error: t('errors.javaRequired') };
            }
        }

        const settings = store.get('settings');

        const accounts = store.get('accounts');
        const selectedAccountId = store.get('selectedAccount');
        const account = accounts.find(a => a.id === selectedAccountId);

        if (!account) {
            return { success: false, error: 'No account selected' };
        }

        const launcher = new Client();

        launcher.on('error', (e) => {
            mainWindow.webContents.send('game-log', `[ERROR] ${e}`);
            if (!gameProcess) {
                mainWindow.webContents.send('launch-progress', { task: 'Error: ' + e, total: 0 });
            }
        });

        launcher.on('progress', (e) => {
            mainWindow.webContents.send('launch-progress', {
                type: e.type,
                task: e.task,
                total: e.total
            });
        });

        launcher.on('download-status', (e) => {
            mainWindow.webContents.send('download-status', {
                name: e.name,
                current: e.current,
                total: e.total
            });
        });

        launcher.on('data', (e) => {
            mainWindow.webContents.send('game-log', e);
        });

        launcher.on('stderr', (e) => {
            mainWindow.webContents.send('game-log', `[ERROR] ${e}`);
        });

        launcher.on('debug', (e) => { });

        launcher.on('close', (code) => {
            gameProcess = null;
            mainWindow.webContents.send('game-closed', code);
        });

        let mcVersion = options.version;
        let customVersion = null;

        if (options.version.includes('OptiFine')) {
            const match = options.version.match(/^(\d+\.\d+(\.\d+)?)/);
            if (match) {
                mcVersion = match[0];
                customVersion = options.version;
            }
        }

        const launchOptions = {
            authorization: account.type === 'microsoft'
                ? {
                    access_token: account.accessToken,
                    client_token: account.clientToken,
                    uuid: account.id,
                    name: account.name,
                    user_properties: {}
                }
                : {
                    access_token: 'offline',
                    client_token: account.id,
                    uuid: getOfflineUUID(account.name), name: account.name,
                    user_properties: {}
                },
            root: settings.gamePath,
            version: {
                number: mcVersion,
                type: options.versionType || 'release',
                custom: customVersion
            },
            memory: {
                min: `${settings.minMemory}M`,
                max: `${settings.maxMemory}M`
            }
        };


        // Java Path Selection
        if (settings.javaPath && fs.existsSync(settings.javaPath)) {
            launchOptions.javaPath = settings.javaPath;
        } else {
            // Auto-detect if manual path not set or invalid
            const autoJavaPath = findJavaPath();
            if (autoJavaPath) {
                launchOptions.javaPath = autoJavaPath;
            }
        }



        if (options.gamePath && options.gamePath !== settings.gamePath) {
            launchOptions.overrides = launchOptions.overrides || {};
            launchOptions.overrides.gameDirectory = options.gamePath;
        }



        // Temporarily disabled optimizations for debugging
        launchOptions.customArgs = [];

        if (settings.javaArgs) {
            launchOptions.customArgs = settings.javaArgs.split(' ');
        }

        if (options.server) {
            const [ip, port] = options.server.split(':');
            launchOptions.server = ip;
            if (port) {
                launchOptions.port = port;
            }

            launchOptions.quickPlay = {
                type: 'multiplayer',
                identifier: options.server
            };
        }

        if (options.modloader && options.modloader !== 'vanilla') {
            launchOptions.overrides = launchOptions.overrides || {};

            launchOptions.overrides.assetIndex = options.version;

            const nativesPath = path.join(settings.gamePath, 'versions', options.version, 'natives');
            try {
                if (!fs.existsSync(nativesPath)) {
                    fs.mkdirSync(nativesPath, { recursive: true });
                }

                const versionJsonPath = path.join(settings.gamePath, 'versions', options.version, `${options.version}.json`);
                if (fs.existsSync(versionJsonPath)) {
                    const versionData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
                    if (versionData.libraries) {
                        const librariesPath = path.join(settings.gamePath, 'libraries');
                        const nativeLibs = versionData.libraries.filter(lib =>
                            lib.name && lib.name.includes('natives-windows') && lib.downloads && lib.downloads.artifact
                        );

                        for (const lib of nativeLibs) {
                            let relativePath = lib.downloads.artifact.path;
                            if (!relativePath && lib.downloads.artifact.url) {
                                try {
                                    relativePath = urlObj.pathname.substring(1);
                                } catch (e) { }
                            }

                            if (!relativePath && lib.name) {
                                const parts = lib.name.split(':');
                                const domain = parts[0].replace(/\./g, '/');
                                const name = parts[1];
                                const version = parts[2];
                                const classifier = parts[3] ? `-${parts[3]}` : '';
                                relativePath = `${domain}/${name}/${version}/${name}-${version}${classifier}.jar`;
                            }

                            if (relativePath) {
                                const jarPath = path.join(librariesPath, relativePath);
                                const existingDlls = fs.existsSync(nativesPath) &&
                                    fs.readdirSync(nativesPath).some(f => f.endsWith('.dll'));

                                if (!existingDlls && fs.existsSync(jarPath)) {
                                    try {
                                        const tempZip = path.join(os.tmpdir(), `native-${Date.now()}-${Math.floor(Math.random() * 1000)}.zip`);

                                        const psCommand = `
                                        Copy-Item -LiteralPath '${jarPath}' -Destination '${tempZip}';
                                        Expand-Archive -LiteralPath '${tempZip}' -DestinationPath '${nativesPath}' -Force;
                                        Remove-Item -LiteralPath '${tempZip}' -Force
                                    `.replace(/\r?\n/g, ' ');
                                        require('child_process').execSync(`powershell -Command "${psCommand}"`);
                                    } catch (extractErr) {
                                        // Silently fail
                                    }
                                }
                            }
                        }
                    }
                }

                launchOptions.overrides.natives = nativesPath;

                try {
                    const dlls = fs.readdirSync(nativesPath).filter(f => f.endsWith('.dll'));
                    for (const dll of dlls) {
                        const src = path.join(nativesPath, dll);
                        const dest = path.join(settings.gamePath, dll);
                        if (!fs.existsSync(dest)) {
                            fs.copyFileSync(src, dest);
                        }
                    }
                } catch (copyErr) {
                    // Silently fail
                }
            } catch (e) {
                const binNatives = path.join(settings.gamePath, 'bin', 'natives');
                if (fs.existsSync(binNatives)) launchOptions.overrides.natives = binNatives;
            }
        }

        if (options.modloader === 'fabric') {
            const fabricId = `fabric-loader-${options.modloaderVersion}-${options.version}`;
            const fabricJsonPath = path.join(settings.gamePath, 'versions', fabricId, `${fabricId}.json`);
            if (!fs.existsSync(fabricJsonPath)) {
                return { success: false, error: "Fabric installation corrupted or missing. Please reinstall the version." };
            }
            launchOptions.version.custom = fabricId;
        } else if (options.modloader === 'forge') {
            const forgeId = `${options.version}-forge-${options.modloaderVersion}`;
            const forgeJsonPath = path.join(settings.gamePath, 'versions', forgeId, `${forgeId}.json`);
            if (fs.existsSync(forgeJsonPath)) {
                launchOptions.version.custom = forgeId;
            } else {
                try {
                    const vanillaJarPath = path.join(settings.gamePath, 'versions', options.version, `${options.version}.jar`);
                    if (!fs.existsSync(vanillaJarPath)) {
                        mainWindow.webContents.send('launch-progress', { task: `Downloading Minecraft ${options.version}...`, total: 0 });
                        const versionList = await withRetry(() => getVersionList());
                        const versionMeta = versionList.versions.find(v => v.id === options.version);
                        if (versionMeta) {
                            await withRetry(() => install(versionMeta, settings.gamePath));
                        }
                    }

                    mainWindow.webContents.send('launch-progress', { task: 'Resolving Forge...', total: 0 });

                    let forgeVersionInfo = null;
                    try {
                        forgeVersionInfo = forgeList.versions.find(v => v.version === options.modloaderVersion);
                    } catch (netErr) {
                        // Silently fail
                    }

                    if (!forgeVersionInfo) {
                        const forgeFullVersion = `${options.version}-${options.modloaderVersion}`;
                        const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${forgeFullVersion}/forge-${forgeFullVersion}-installer.jar`;

                        forgeVersionInfo = {
                            version: options.modloaderVersion,
                            mcversion: options.version,
                            installer: {
                                path: installerUrl,
                                url: installerUrl
                            }
                        };
                    }

                    mainWindow.webContents.send('launch-progress', { task: `Installing Forge ${options.modloaderVersion}...`, total: 100 });

                    // Ensure we have a valid Java path for the installer
                    const installerOptions = {};
                    const detectJava = findJavaPath();
                    if (detectJava) {
                        installerOptions.java = detectJava;
                    }

                    const installedVersion = await withRetry(() => installForge(forgeVersionInfo, settings.gamePath, installerOptions));

                    const checkPath = path.join(settings.gamePath, 'versions', installedVersion, `${installedVersion}.json`);
                    if (!fs.existsSync(checkPath)) {
                        throw new Error(`Forge installation failed: version JSON missing at ${checkPath}`);
                    }

                    launchOptions.version.custom = installedVersion;

                    const majorVer = parseInt(options.version.split('.')[1]);
                    if (majorVer >= 18 && options.modloader !== 'forge') {
                        const java17Args = [
                            "--add-modules", "jdk.dynalink",
                            "--add-opens", "java.base/java.util.jar=ALL-UNNAMED",
                            "--add-opens", "java.base/java.lang=ALL-UNNAMED",
                            "--add-opens", "java.base/java.lang.invoke=ALL-UNNAMED",
                            "--add-opens", "java.base/java.math=ALL-UNNAMED",
                            "--add-opens", "java.base/java.util=ALL-UNNAMED",
                            "--add-opens", "java.base/java.io=ALL-UNNAMED",
                            "--add-opens", "java.base/java.nio=ALL-UNNAMED",
                            "--add-opens", "java.base/java.text=ALL-UNNAMED",
                            "--add-opens", "java.logging/java.util.logging=ALL-UNNAMED",
                            "--add-opens", "java.desktop/sun.awt=ALL-UNNAMED",
                            "--add-opens", "java.base/sun.security.util=ALL-UNNAMED",
                            "--add-opens", "java.base/sun.util.logging=ALL-UNNAMED"
                        ];

                        if (!launchOptions.customArgs) launchOptions.customArgs = [];
                        if (!launchOptions.customArgs.some(a => a.includes('jdk.dynalink'))) {
                            launchOptions.customArgs.push(...java17Args);
                        }
                    }

                } catch (err) {
                    const guessId = `${options.version}-forge-${options.modloaderVersion}`;
                    const versionJsonPath = path.join(settings.gamePath, 'versions', guessId, `${guessId}.json`);

                    if (fs.existsSync(versionJsonPath)) {
                        launchOptions.version.custom = guessId;
                    } else {
                        throw new Error("Forge installation failed and no cached version found. Details: " + err.message);
                    }
                }
            }
        }

        if (options.version === '1.20.1' && options.modloader === 'forge' && launchOptions.version.custom) {
            const confirmedJava17 = "C:\\Program Files\\Java\\jdk-17\\bin\\javaw.exe";
            if (fs.existsSync(confirmedJava17)) {
                launchOptions.javaPath = confirmedJava17;
            } else {
                // Not found
            }

            const libDir = path.join(settings.gamePath, 'libraries');

            try {
                const forgeVersionId = launchOptions.version.custom;
                const forgeJsonPath = path.join(settings.gamePath, 'versions', forgeVersionId, `${forgeVersionId}.json`);
                if (fs.existsSync(forgeJsonPath)) {
                    const forgeJson = fs.readJsonSync(forgeJsonPath);
                    if (forgeJson.arguments && forgeJson.arguments.jvm) {
                        const nativesPath = launchOptions.overrides.natives || '';
                        const jvmArgs = forgeJson.arguments.jvm.map(arg => {
                            if (typeof arg !== 'string') return null;
                            let result = arg
                                .replaceAll('${library_directory}', libDir)
                                .replaceAll('${classpath_separator}', path.delimiter)
                                .replaceAll('${version_name}', options.version)
                                .replaceAll('${natives_directory}', nativesPath)
                                .replaceAll('${launcher_name}', 'WTFLauncher')
                                .replaceAll('${launcher_version}', '1.0.0');

                            if (result.startsWith('-DignoreList=')) {
                                result = result + `,${forgeVersionId}.jar`;
                            }
                            return result;
                        }).filter(a => a !== null);

                        if (!launchOptions.customArgs) launchOptions.customArgs = [];

                        launchOptions.customArgs.push(...jvmArgs);

                        if (nativesPath) {
                            const javaLibArg = `-Djava.library.path=${nativesPath}`;
                            launchOptions.customArgs = launchOptions.customArgs.filter(a => !a.startsWith('-Djava.library.path'));
                            launchOptions.customArgs.push(javaLibArg);
                        }
                    }
                }
            } catch (jsonErr) { }
        }

        gameProcess = await launcher.launch(launchOptions);

        if (gameProcess) {
            gameProcess.on('close', (code) => {
                mainWindow.webContents.send('game-closed', code);
                gameProcess = null;
            });

            mainWindow.webContents.send('game-started');
            return { success: true };
        } else {
            return { success: false, error: "Failed to start game process (null)" };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('stop-game', () => {
    if (gameProcess) {
        gameProcess.kill();
        gameProcess = null;
        return true;
    }
    return false;
});

ipcMain.handle('get-app-path', () => {
    return app.getPath('appData');
});

const DEFAULT_NEWS = {
    launcher: [
        {
            title: "WTFLauncher v1.1.0 Release",
            date: "2026-02-02",
            image: "",
            text: "We're excited to introduce the first version of the WTFLauncher launcher. Our launcher features a beautiful design, security, and high performance. It also offers extensive functionality! You can download modpacks, mods, and resource packs from trusted resources like Modrinth and CurseForge! The launcher is actively being improved, and we actively consider our users' feedback and incorporate their ideas into the launcher. Stay up-to-date on the latest news in our Discord channel or directly in the launcher!",
            link: ""
        }
    ]
};

ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
    return true;
});

ipcMain.handle('get-news', () => {
    return DEFAULT_NEWS;
});

ipcMain.handle('get-server-status', async (event, ip) => {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(`https://api.mcsrvstat.us/2/${ip}`);
        if (!response.ok) return { online: false };
        return await response.json();
    } catch (error) {
        return { online: false };
    }
});

const DEFAULT_SERVERS = [
    {
        name: "Hypixel",
        ip: "mc.hypixel.net",
        icon: "https://api.mcstatus.io/v2/icon/mc.hypixel.net",
        active: true
    },
    {
        name: "FunTime",
        ip: "funtime.su",
        icon: "https://api.mcstatus.io/v2/icon/funtime.su",
        active: true
    },
    {
        name: "PolitMine",
        ip: "politmine.ru",
        icon: "https://api.mcstatus.io/v2/icon/politmine.ru",
        active: true
    },
    {
        name: "2B2T",
        ip: "2b2t.org",
        icon: "https://api.mcstatus.io/v2/icon/2b2t.org",
        active: true
    },
    {
        name: "MineLand",
        ip: "promo.mineland.net",
        icon: "https://api.mcstatus.io/v2/icon/promo.mineland.net",
        active: true
    },
    {
        name: "PVP Club",
        ip: "mcpvp.club",
        icon: "https://api.mcstatus.io/v2/icon/mcpvp.club",
        active: true
    },
    {
        name: "SaturnX",
        ip: "play.saturn-x.space",
        icon: "https://api.mcstatus.io/v2/icon/play.saturn-x.space",
        active: true
    }
];

ipcMain.handle('get-servers', () => {
    return DEFAULT_SERVERS;
});

