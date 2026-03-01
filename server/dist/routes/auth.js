import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
const router = Router();
// JWT Secrets - in production, use environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m'; // Access token expires in 15 minutes
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expires in 7 days
// Middleware to verify JWT token
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ success: false, error: 'No token provided' });
    }
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};
// POST /api/auth/signup - Register new user
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: 'User with this email already exists'
            });
        }
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword
            }
        });
        // Generate JWT tokens
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        const refreshToken = jwt.sign({ userId: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                starknetAddr: user.starknetAddr
            }
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user',
            details: error.message
        });
    }
});
// POST /api/auth/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                delegation: true
            }
        });
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        // Verify password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid email or password'
            });
        }
        // Generate JWT tokens
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        const refreshToken = jwt.sign({ userId: user.id, email: user.email }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
        res.json({
            success: true,
            message: 'Login successful',
            token,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                starknetAddr: user.starknetAddr,
                amountDelegated: user.delegation?.amountDelegated || 0
            }
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to login',
            details: error.message
        });
    }
});
// GET /api/auth/me - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                delegation: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                starknetAddr: user.starknetAddr,
                amountDelegated: user.delegation?.amountDelegated || 0,
                lastTxHash: user.delegation?.lastTxHash,
                lastUpdated: user.delegation?.lastUpdated
            }
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get user info',
            details: error.message
        });
    }
});
// POST /api/auth/link-wallet - Link Starknet wallet to user account
router.post('/link-wallet', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { starknetAddr } = req.body;
        if (!starknetAddr) {
            return res.status(400).json({
                success: false,
                error: 'Starknet address is required'
            });
        }
        // Check if address is already linked to another user
        const existingUser = await prisma.user.findUnique({
            where: { starknetAddr }
        });
        if (existingUser && existingUser.id !== userId) {
            return res.status(409).json({
                success: false,
                error: 'This wallet is already linked to another account'
            });
        }
        // Update user with Starknet address
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { starknetAddr },
            include: { delegation: true }
        });
        res.json({
            success: true,
            message: 'Wallet linked successfully',
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                starknetAddr: updatedUser.starknetAddr,
                amountDelegated: updatedUser.delegation?.amountDelegated || 0
            }
        });
    }
    catch (error) {
        console.error('Link wallet error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to link wallet',
            details: error.message
        });
    }
});
// POST /api/auth/refresh - Refresh access token using refresh token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }
        // Verify refresh token
        jwt.verify(refreshToken, JWT_REFRESH_SECRET, (err, user) => {
            if (err) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid or expired refresh token'
                });
            }
            // Generate new access token
            const newToken = jwt.sign({ userId: user.userId, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
            res.json({
                success: true,
                token: newToken,
                message: 'Token refreshed successfully'
            });
        });
    }
    catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh token',
            details: error.message
        });
    }
});
export default router;
