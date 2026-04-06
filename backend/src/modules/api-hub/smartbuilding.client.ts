import { logger } from '../../shared/logger';

const SBA_BASE = 'https://smartbuildingapp.com:8443';
const TOKEN_URL = `${SBA_BASE}/auth/developer-key/token`;
const TOKEN_TTL_MS = 55 * 60 * 1000; // 55 min safety margin before 60min expiry

export interface SBACredentials {
    brandId: string;
    clientId: string;
    clientSecret: string;
    /** Cached token — provide if available to skip re-auth */
    cachedToken?: string | null;
    /** When the cached token expires */
    tokenExpires?: Date | null;
}

export interface SBATokenResult {
    token: string;
    expiresAt: Date;
    fromCache: boolean;
}

// ─── SmartBuildingApp HTTP Client ────────────────────────────────────────────

/**
 * Obtains a valid JWT token for the given credentials.
 * Returns the cached token if it is still valid; otherwise fetches a new one.
 */
export async function getToken(creds: SBACredentials): Promise<SBATokenResult> {
    // Check if cached token is still valid (with 2-minute buffer)
    if (creds.cachedToken && creds.tokenExpires) {
        const buffer = 2 * 60 * 1000;
        if (new Date(creds.tokenExpires).getTime() - Date.now() > buffer) {
            return { token: creds.cachedToken, expiresAt: new Date(creds.tokenExpires), fromCache: true };
        }
    }

    logger.info('[SmartBuilding] Fetching new access token', { brandId: creds.brandId });

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'appid': creds.brandId,
        },
        body: JSON.stringify({
            client_id: creds.clientId,
            client_secret: creds.clientSecret,
        }),
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`SmartBuilding auth failed (${res.status}): ${body}`);
    }

    const data = await res.json() as { token?: string; access_token?: string };
    const token = data.token || data.access_token;
    if (!token) {
        throw new Error('SmartBuilding auth response did not contain a token');
    }

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    return { token, expiresAt, fromCache: false };
}

/**
 * Makes an authenticated request to the SmartBuilding API.
 * @param creds  Brand credentials (including optional cached token)
 * @param path   Path relative to the API server (e.g. "/buildings")
 * @param opts   Fetch options (method, body, etc.)
 */
export async function sbaRequest<T = any>(
    creds: SBACredentials,
    path: string,
    opts: RequestInit = {}
): Promise<{ data: T; tokenResult: SBATokenResult }> {
    const tokenResult = await getToken(creds);

    const url = `${SBA_BASE}${path}`;
    logger.info(`[SmartBuilding] ${opts.method || 'GET'} ${path}`);

    const res = await fetch(url, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'x-access-token': tokenResult.token,
            'appid': creds.brandId,
            ...opts.headers,
        },
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`SmartBuilding API error ${res.status} on ${path}: ${body}`);
    }

    const data = await res.json() as T;
    return { data, tokenResult };
}

// ─── Typed API helpers ────────────────────────────────────────────────────────

/** GET /auth/me — verify credentials */
export async function getMe(creds: SBACredentials) {
    return sbaRequest(creds, '/auth/me');
}

/** GET /buildings */
export async function getBuildings(creds: SBACredentials, page = 1, limit = 100) {
    return sbaRequest(creds, `/buildings?page=${page}&limit=${limit}`);
}

/** GET /mda/database-identifiers/:communityId */
export async function getMdaDatabaseIdentifiers(creds: SBACredentials, communityId: number) {
    return sbaRequest(creds, `/mda/database-identifiers/${communityId}`);
}

/** GET /mda/sync-data-summary/:communityId/:dbIdentifier */
export async function getMdaSyncSummary(creds: SBACredentials, communityId: number, dbIdentifier: string) {
    return sbaRequest(creds, `/mda/sync-data-summary/${communityId}/${encodeURIComponent(dbIdentifier)}`);
}

/** GET /mda/tenants-summary/:communityId/:dbIdentifier */
export async function getMdaTenantsSummary(
    creds: SBACredentials, communityId: number, dbIdentifier: string, page = 1, pageSize = 25, search = ''
) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
    return sbaRequest(creds, `/mda/tenants-summary/${communityId}/${encodeURIComponent(dbIdentifier)}?${params}`);
}

/** GET /mda/owners/:communityId/:dbIdentifier */
export async function getMdaOwners(
    creds: SBACredentials, communityId: number, dbIdentifier: string, page = 1, pageSize = 25
) {
    return sbaRequest(creds, `/mda/owners/${communityId}/${encodeURIComponent(dbIdentifier)}?page=${page}&pageSize=${pageSize}`);
}

/** GET /mda/properties/:communityId/:dbIdentifier */
export async function getMdaProperties(
    creds: SBACredentials, communityId: number, dbIdentifier: string, page = 1, pageSize = 25
) {
    return sbaRequest(creds, `/mda/properties/${communityId}/${encodeURIComponent(dbIdentifier)}?page=${page}&pageSize=${pageSize}`);
}

/** GET /mda/property-units/:communityId/:dbIdentifier */
export async function getMdaPropertyUnits(
    creds: SBACredentials, communityId: number, dbIdentifier: string, page = 1, pageSize = 25
) {
    return sbaRequest(creds, `/mda/property-units/${communityId}/${encodeURIComponent(dbIdentifier)}?page=${page}&pageSize=${pageSize}`);
}

/** GET /mda/realtime/tenant-account-status/:communityId/:dbIdentifier */
export async function getMdaTenantAccountStatus(
    creds: SBACredentials, communityId: number, dbIdentifier: string, tenantId: number, period: number
) {
    const params = new URLSearchParams({ tenantId: String(tenantId), period: String(period) });
    return sbaRequest(creds, `/mda/realtime/tenant-account-status/${communityId}/${encodeURIComponent(dbIdentifier)}?${params}`);
}

/** GET /mda/realtime/tenant-active-leases/:communityId/:dbIdentifier/:tenantId */
export async function getMdaActiveLeases(
    creds: SBACredentials, communityId: number, dbIdentifier: string, tenantId: number
) {
    return sbaRequest(creds, `/mda/realtime/tenant-active-leases/${communityId}/${encodeURIComponent(dbIdentifier)}/${tenantId}`);
}

/** POST /api/v1/reportIncident */
export async function reportIncident(creds: SBACredentials, payload: {
    category: number; message: string; comID: number; longitude?: number; latitude?: number;
}) {
    return sbaRequest(creds, '/api/v1/reportIncident', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/** POST /api/v1/getReportTypes */
export async function getReportTypes(creds: SBACredentials, comID: number) {
    return sbaRequest(creds, '/api/v1/getReportTypes', {
        method: 'POST',
        body: JSON.stringify({ comID }),
    });
}
