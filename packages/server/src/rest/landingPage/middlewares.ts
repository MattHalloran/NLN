import { Request, Response, NextFunction } from "express";

// Extend Express Request to include auth properties
export interface AuthenticatedRequest extends Request {
    isAdmin?: boolean;
}

/**
 * Middleware to check if the user has admin access
 */
export const requireAdmin = (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
): void => {
    if (!req.isAdmin) {
        res.status(403).json({ error: "Admin access required" });
        return;
    }
    next();
};
