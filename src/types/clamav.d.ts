declare module 'clamav.js' {
  interface ClamAVOptions {
    removeInfected?: boolean;
    quarantineInfected?: boolean;
    scanLog?: string | null;
    debugMode?: boolean;
    fileList?: string[] | null;
    scanTimeout?: number;
  }

  interface ScanResult {
    isInfected: boolean;
    viruses?: string[];
  }

  interface ClamAVScanner {
    scanStream(stream: NodeJS.ReadableStream): Promise<ScanResult>;
    scanBuffer(buffer: Buffer): Promise<ScanResult>;
  }

  export function createScanner(options: ClamAVOptions): Promise<ClamAVScanner>;
}
