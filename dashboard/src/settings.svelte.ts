export interface LinkSettings {
    env: string;
    domain: string;
    preferExisting: boolean;
}

export interface ProxySettings {
    env: string;
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        const val = parts.pop()?.split(';').shift();
        return val ? decodeURIComponent(val) : null;
    }
    return null;
}

function setCookie(name: string, value: string) {
    if (typeof document === 'undefined') return;
    const maxAge = 60 * 60 * 24 * 365; // 1 year

    let domain = window.location.hostname;
    const parts = domain.split('.');
    // Set cookie on root domain (e.g. .aidungeon.link) to share with subdomains
    if (parts.length > 1 && !domain.includes("localhost") && !domain.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
        domain = parts.slice(-2).join('.');
    }

    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; domain=.${domain}`;
}

function loadSettings<T>(name: string, defaultValue: T): T {
    const val = getCookie(name);
    if (val) {
        try {
            return { ...defaultValue, ...JSON.parse(val) };
        } catch {
            // ignore
        }
    }
    return defaultValue;
}

class Settings {
    link = $state<LinkSettings>(loadSettings("link_settings", {
        env: "",
        domain: "aidungeon.link",
        preferExisting: true
    }));

    proxy = $state<ProxySettings>(loadSettings("proxy_settings", {
        env: ""
    }));

    syncStatus = $state<'idle' | 'syncing' | 'success' | 'error'>('idle');

    saveLink() {
        setCookie("link_settings", JSON.stringify(this.link));
    }

    saveProxy() {
        setCookie("proxy_settings", JSON.stringify(this.proxy));
    }

    get otherDomain() {
        if (typeof window === 'undefined') return null;
        const host = window.location.hostname;
        if (host.includes("aidungeon.link")) return "axdungeon.com";
        if (host.includes("axdungeon.com")) return "aidungeon.link";
        return null;
    }

    async syncToOther(scope: 'link' | 'proxy' | 'all' = 'all') {
        if (this.syncStatus === 'syncing') return;
        this.syncStatus = 'syncing';

        const width = 600;
        const height = 400;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        const popup = window.open(
            `/sync?mode=popup&scope=${scope}`,
            'sync_popup',
            `width=${width},height=${height},top=${top},left=${left}`
        );

        if (!popup) {
            this.syncStatus = 'error';
            setTimeout(() => this.syncStatus = 'idle', 3000);
            return;
        }

        const messageHandler = (event: MessageEvent) => {
            if (event.data?.type === 'sync_complete') {
                this.syncStatus = 'success';
                window.removeEventListener('message', messageHandler);
                setTimeout(() => {
                    this.syncStatus = 'idle';
                }, 3000);
            }
        };

        window.addEventListener('message', messageHandler);

        const timer = setInterval(() => {
            if (popup.closed) {
                clearInterval(timer);
                window.removeEventListener('message', messageHandler);
                if (this.syncStatus === 'syncing') {
                    this.syncStatus = 'idle';
                }
            }
        }, 500);
    }
}

export const settings = new Settings();
