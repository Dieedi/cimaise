interface Window {
    electronAPI: {
        saveFile: (data: Uint8Array) => Promise<void>;
        openFile: () => Promise<ArrayBuffer | null>;
    }
}