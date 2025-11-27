export type UserRole = 'admin' | 'user';

export interface User {
    id: string;
    username: string;
    password?: string; // Optional for response
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
}

export interface UserRow {
    id: string;
    username: string;
    password: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
}
