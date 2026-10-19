export const ROLES = ["guest", "viewer", "admin"] as const;

export type Role = typeof ROLES[number];

// Roles an admin can hand out. A guest role comes from logging in as one, never from assignment.
export const ASSIGNABLE_ROLES = ["viewer", "admin"] as const satisfies readonly Role[];

export type AssignableRole = typeof ASSIGNABLE_ROLES[number];

export function isGuest(role: Role): boolean {
    return role === "guest";
}   

export function isViewer(role: Role): boolean {
    return role === "viewer";
}   

export function isAdmin(role: Role): boolean {
    return role === "admin";
}   

// The author or an admin may change the text, the issue and delete.
export function canEditComment(comment: { userId: string | null }, role: Role, userId: string | null): boolean {
    return isAdmin(role) || (comment.userId !== null && comment.userId === userId);
}
