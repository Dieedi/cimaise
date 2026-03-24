interface Window {
    electronAPI: {
        saveFile: (data: Uint8Array) => Promise<string | null>;
        saveFileTo: (filePath: string, data: Uint8Array) => Promise<void>;
        openFile: () => Promise<[ArrayBuffer, string] | null>;
        moveWindow: (dx: number, dy: number) => void;
    }
}