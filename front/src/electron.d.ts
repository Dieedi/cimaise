interface Window {
    electronAPI: {
        saveFile: (data: Uint8Array) => Promise<string | null>;
        openFile: () => Promise<ArrayBuffer | null>;
        moveWindow: (dx: number, dy: number) => void;
    }
}