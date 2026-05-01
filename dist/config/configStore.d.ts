export declare const configDir: string;
export declare const configFilePath: string;
export declare const authStatePath: string;
export declare const systemPromptPath: string;
export declare const postTemplatePath: string;
export interface StoredEncryptedKey {
    iv: string;
    data: string;
}
export interface StoredConfig {
    postsOutputDir?: string;
    imagesOutputDir?: string;
    cacheDir?: string;
    openaiModel?: string;
    openaiEndpoint?: string;
    openaiApiKey?: StoredEncryptedKey;
}
export declare function encryptApiKey(plain: string): StoredEncryptedKey;
export declare function decryptApiKey(stored: StoredEncryptedKey): string;
export declare function readConfig(): StoredConfig;
export declare function writeConfig(partial: StoredConfig): void;
export declare function getApiKey(): string;
