import { Request } from 'express';

export interface AdminAuthContext {
    userId: string;
    email: string;
    role: 'super_admin' | 'scheme_admin' | 'scheme_viewer';
    assignedSchemeIds: string[];
    companyId?: string;
}

export interface AdminRequest extends Request {
    admin?: AdminAuthContext;
}
