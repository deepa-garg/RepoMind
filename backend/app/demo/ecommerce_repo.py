"""
Comprehensive Production Demo Repository for RepoMind:
Realistic multi-layer e-commerce backend platform with Auth, Users, Orders, Payments, Database,
Middleware, and Unit Tests. Includes deliberate real-world architectural patterns and corner cases.
"""

from typing import Dict, Any, List

DEMO_REPO_FILES: Dict[str, Dict[str, Any]] = {
    "src/auth/TokenService.ts": {
        "layer": "service",
        "language": "typescript",
        "content": """import jwt from 'jsonwebtoken';
import { Logger } from '../utils/Logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class TokenService {
  private secretKey: string;
  private refreshSecret: string;
  private tokenExpirySeconds: number;

  constructor() {
    this.secretKey = process.env.JWT_SECRET || 'dev-insecure-secret-key';
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-insecure-key';
    this.tokenExpirySeconds = 900; // 15 minutes
  }

  /**
   * Generates a signed JWT access token for the given payload.
   */
  public generateAccessToken(payload: TokenPayload): string {
    Logger.info(`Issuing access token for user: ${payload.userId}`);
    return jwt.sign(payload, this.secretKey, {
      expiresIn: this.tokenExpirySeconds,
      algorithm: 'HS256',
    });
  }

  /**
   * Generates a refresh token for long-lived session persistence.
   */
  public generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: 'refresh' }, this.refreshSecret, {
      expiresIn: '7d',
    });
  }

  /**
   * Verifies access token integrity and extracts payload.
   * NOTE: Suspicious logic: Does not accommodate clock skew tolerance on refresh,
   * causing occasional premature invalidation during rapid client page reload.
   */
  public verifyToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.secretKey) as TokenPayload;
      return decoded;
    } catch (error: any) {
      Logger.warn(`Token verification failed: ${error.message}`);
      throw new Error('INVALID_TOKEN');
    }
  }

  /**
   * Validates refresh token and returns user ID.
   */
  public verifyRefreshToken(token: string): string {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as { userId: string };
      return decoded.userId;
    } catch (error) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }
}
""",
        "symbols": [
            {"name": "TokenPayload", "kind": "interface", "line_start": 4, "line_end": 8, "calls": []},
            {"name": "TokenService", "kind": "class", "line_start": 10, "line_end": 64, "calls": ["Logger.info", "jwt.sign", "jwt.verify"]},
            {"name": "generateAccessToken", "kind": "method", "line_start": 23, "line_end": 29, "calls": ["jwt.sign", "Logger.info"]},
            {"name": "generateRefreshToken", "kind": "method", "line_start": 34, "line_end": 38, "calls": ["jwt.sign"]},
            {"name": "verifyToken", "kind": "method", "line_start": 45, "line_end": 53, "calls": ["jwt.verify", "Logger.warn"]},
            {"name": "verifyRefreshToken", "kind": "method", "line_start": 58, "line_end": 65, "calls": ["jwt.verify"]}
        ],
        "dependencies": ["src/utils/Logger.ts"],
        "dependents": ["src/auth/AuthService.ts", "src/middleware/AuthMiddleware.ts"]
    },

    "src/auth/AuthService.ts": {
        "layer": "service",
        "language": "typescript",
        "content": """import bcrypt from 'bcrypt';
import { TokenService, TokenPayload } from './TokenService';
import { UserRepository } from '../repositories/UserRepository';
import { Logger } from '../utils/Logger';

export class AuthService {
  private tokenService: TokenService;
  private userRepository: UserRepository;

  constructor(tokenService?: TokenService, userRepository?: UserRepository) {
    this.tokenService = tokenService || new TokenService();
    this.userRepository = userRepository || new UserRepository();
  }

  /**
   * Authenticates user credentials and returns tokens.
   */
  public async login(email: string, passwordPlain: string): Promise<{ accessToken: string; refreshToken: string; user: any }> {
    Logger.info(`Attempting login authentication for: ${email}`);
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    const passwordMatch = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!passwordMatch) {
      Logger.warn(`Failed login password verification for: ${email}`);
      throw new Error('INVALID_CREDENTIALS');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.tokenService.generateAccessToken(payload);
    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.userRepository.updateLastLogin(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }

  /**
   * Validates access token and resolves active user entity.
   */
  public async validateToken(token: string): Promise<any> {
    const payload = this.tokenService.verifyToken(token);
    const user = await this.userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new Error('USER_INACTIVE_OR_REVOKED');
    }
    return user;
  }

  /**
   * Refreshes access token given valid refresh token.
   */
  public async refreshUserSession(refreshToken: string): Promise<{ accessToken: string }> {
    const userId = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new Error('USER_SESSION_EXPIRED');
    }

    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return { accessToken: this.tokenService.generateAccessToken(payload) };
  }
}
""",
        "symbols": [
            {"name": "AuthService", "kind": "class", "line_start": 6, "line_end": 79, "calls": ["TokenService", "UserRepository", "bcrypt.compare"]},
            {"name": "login", "kind": "method", "line_start": 18, "line_end": 48, "calls": ["UserRepository.findByEmail", "bcrypt.compare", "TokenService.generateAccessToken", "TokenService.generateRefreshToken", "UserRepository.updateLastLogin"]},
            {"name": "validateToken", "kind": "method", "line_start": 53, "line_end": 60, "calls": ["TokenService.verifyToken", "UserRepository.findById"]},
            {"name": "refreshUserSession", "kind": "method", "line_start": 65, "line_end": 78, "calls": ["TokenService.verifyRefreshToken", "UserRepository.findById", "TokenService.generateAccessToken"]}
        ],
        "dependencies": ["src/auth/TokenService.ts", "src/repositories/UserRepository.ts", "src/utils/Logger.ts"],
        "dependents": ["src/controllers/AuthController.ts", "src/middleware/AuthMiddleware.ts", "tests/auth/AuthService.test.ts"]
    },

    "src/controllers/AuthController.ts": {
        "layer": "presentation",
        "language": "typescript",
        "content": """import { Request, Response } from 'express';
import { AuthService } from '../auth/AuthService';
import { Logger } from '../utils/Logger';

export class AuthController {
  private authService: AuthService;

  constructor(authService?: AuthService) {
    this.authService = authService || new AuthService();
  }

  /**
   * POST /api/auth/login
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ error: 'MISSING_CREDENTIALS' });
        return;
      }

      const result = await this.authService.login(email, password);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      Logger.error(`AuthController login error: ${error.message}`);
      res.status(401).json({ error: error.message });
    }
  }

  /**
   * POST /api/auth/refresh
   */
  public async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res.status(400).json({ error: 'MISSING_REFRESH_TOKEN' });
        return;
      }
      const result = await this.authService.refreshUserSession(refreshToken);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(401).json({ error: 'INVALID_REFRESH_SESSION' });
    }
  }
}
""",
        "symbols": [
            {"name": "AuthController", "kind": "class", "line_start": 5, "line_end": 51, "calls": ["AuthService.login", "AuthService.refreshUserSession"]},
            {"name": "login", "kind": "method", "line_start": 15, "line_end": 33, "calls": ["AuthService.login", "Logger.error"]},
            {"name": "refresh", "kind": "method", "line_start": 38, "line_end": 50, "calls": ["AuthService.refreshUserSession"]}
        ],
        "dependencies": ["src/auth/AuthService.ts", "src/utils/Logger.ts"],
        "dependents": ["tests/controllers/AuthController.test.ts"]
    },

    "src/middleware/AuthMiddleware.ts": {
        "layer": "presentation",
        "language": "typescript",
        "content": """import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/AuthService';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export class AuthMiddleware {
  private authService: AuthService;

  constructor(authService?: AuthService) {
    this.authService = authService || new AuthService();
  }

  /**
   * Intercepts incoming requests and verifies Bearer token in headers.
   */
  public authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'UNAUTHORIZED_NO_TOKEN' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const user = await this.authService.validateToken(token);
      req.user = user;
      next();
    } catch (err: any) {
      res.status(401).json({ error: 'TOKEN_INVALID_OR_EXPIRED', detail: err.message });
    }
  };
}
""",
        "symbols": [
            {"name": "AuthenticatedRequest", "kind": "interface", "line_start": 4, "line_end": 6, "calls": []},
            {"name": "AuthMiddleware", "kind": "class", "line_start": 8, "line_end": 32, "calls": ["AuthService.validateToken"]},
            {"name": "authenticate", "kind": "method", "line_start": 18, "line_end": 31, "calls": ["AuthService.validateToken"]}
        ],
        "dependencies": ["src/auth/AuthService.ts"],
        "dependents": ["src/controllers/UserController.ts", "src/controllers/OrderController.ts"]
    },

    "src/controllers/UserController.ts": {
        "layer": "presentation",
        "language": "typescript",
        "content": """import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { UserService } from '../services/UserService';

export class UserController {
  private userService: UserService;

  constructor(userService?: UserService) {
    this.userService = userService || new UserService();
  }

  /**
   * GET /api/users/profile
   */
  public async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'UNAUTHENTICATED' });
      return;
    }
    const profile = await this.userService.getUserProfile(userId);
    res.status(200).json({ user: profile });
  }

  /**
   * PUT /api/users/:id
   */
  public async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const userId = req.params.id;
    const updateData = req.body;
    const updated = await this.userService.updateUser(userId, updateData);
    res.status(200).json({ user: updated });
  }
}
""",
        "symbols": [
            {"name": "UserController", "kind": "class", "line_start": 5, "line_end": 34, "calls": ["UserService.getUserProfile", "UserService.updateUser"]},
            {"name": "getProfile", "kind": "method", "line_start": 15, "line_end": 23, "calls": ["UserService.getUserProfile"]},
            {"name": "updateProfile", "kind": "method", "line_start": 28, "line_end": 33, "calls": ["UserService.updateUser"]}
        ],
        "dependencies": ["src/middleware/AuthMiddleware.ts", "src/services/UserService.ts"],
        "dependents": []
    },

    "src/services/UserService.ts": {
        "layer": "service",
        "language": "typescript",
        "content": """import { UserRepository } from '../repositories/UserRepository';
import { Logger } from '../utils/Logger';

export class UserService {
  private userRepo: UserRepository;

  constructor(userRepo?: UserRepository) {
    this.userRepo = userRepo || new UserRepository();
  }

  public async getUserProfile(userId: string): Promise<any> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }
    const { passwordHash, ...cleanProfile } = user;
    return cleanProfile;
  }

  /**
   * Updates core user profile attributes.
   * Central business logic method called by multiple controllers and admin services.
   */
  public async updateUser(userId: string, data: Partial<any>): Promise<any> {
    Logger.info(`Updating user entity: ${userId}`);
    const existing = await this.userRepo.findById(userId);
    if (!existing) {
      throw new Error('USER_NOT_FOUND');
    }

    const updatedUser = await this.userRepo.update(userId, data);
    return updatedUser;
  }
}
""",
        "symbols": [
            {"name": "UserService", "kind": "class", "line_start": 4, "line_end": 33, "calls": ["UserRepository.findById", "UserRepository.update", "Logger.info"]},
            {"name": "getUserProfile", "kind": "method", "line_start": 11, "line_end": 18, "calls": ["UserRepository.findById"]},
            {"name": "updateUser", "kind": "method", "line_start": 24, "line_end": 32, "calls": ["UserRepository.findById", "UserRepository.update", "Logger.info"]}
        ],
        "dependencies": ["src/repositories/UserRepository.ts", "src/utils/Logger.ts"],
        "dependents": ["src/controllers/UserController.ts", "src/services/OrderService.ts"]
    },

    "src/repositories/UserRepository.ts": {
        "layer": "repository",
        "language": "typescript",
        "content": """import { Database } from '../database/Database';
import { User } from '../models/User';

export class UserRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || Database.getInstance();
  }

  public async findById(id: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL';
    const rows = await this.db.query(sql, [id]);
    return rows[0] || null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const sql = 'SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL';
    const rows = await this.db.query(sql, [email]);
    return rows[0] || null;
  }

  public async update(id: string, fields: Partial<User>): Promise<User> {
    const sql = 'UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2 RETURNING *';
    const rows = await this.db.query(sql, [fields.name, id]);
    return rows[0];
  }

  public async updateLastLogin(id: string): Promise<void> {
    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id]);
  }
}
""",
        "symbols": [
            {"name": "UserRepository", "kind": "class", "line_start": 4, "line_end": 32, "calls": ["Database.getInstance", "Database.query"]},
            {"name": "findById", "kind": "method", "line_start": 11, "line_end": 15, "calls": ["Database.query"]},
            {"name": "findByEmail", "kind": "method", "line_start": 17, "line_end": 21, "calls": ["Database.query"]},
            {"name": "update", "kind": "method", "line_start": 23, "line_end": 27, "calls": ["Database.query"]},
            {"name": "updateLastLogin", "kind": "method", "line_start": 29, "line_end": 31, "calls": ["Database.query"]}
        ],
        "dependencies": ["src/database/Database.ts", "src/models/User.ts"],
        "dependents": ["src/auth/AuthService.ts", "src/services/UserService.ts"]
    },

    "src/services/OrderService.ts": {
        "layer": "service",
        "language": "typescript",
        "content": """import { OrderRepository } from '../repositories/OrderRepository';
import { PaymentGateway } from './PaymentGateway';
import { UserService } from './UserService';
import { Logger } from '../utils/Logger';

export interface CreateOrderDTO {
  userId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  paymentToken: string;
  shippingAddress: string;
}

export class OrderService {
  private orderRepo: OrderRepository;
  private paymentGateway: PaymentGateway;
  private userService: UserService;

  constructor(
    orderRepo?: OrderRepository,
    paymentGateway?: PaymentGateway,
    userService?: UserService
  ) {
    this.orderRepo = orderRepo || new OrderRepository();
    this.paymentGateway = paymentGateway || new PaymentGateway();
    this.userService = userService || new UserService();
  }

  /**
   * Calculates subtotal, shipping taxes, processes charge and creates order.
   */
  public async createOrder(dto: CreateOrderDTO): Promise<any> {
    Logger.info(`Initiating order creation for user: ${dto.userId}`);
    const user = await this.userService.getUserProfile(dto.userId);

    const subtotal = dto.items.reduce((acc, item) => acc + item.quantity * item.price, 0);
    const shipping = this.calculateShippingCost(subtotal, dto.shippingAddress);
    const totalAmount = subtotal + shipping;

    // Process charge via Payment Gateway
    const paymentResult = await this.paymentGateway.chargeCustomer({
      amount: totalAmount,
      currency: 'USD',
      sourceToken: dto.paymentToken,
      customerId: user.id,
    });

    if (!paymentResult.success) {
      Logger.error(`Payment processing failed for order: ${paymentResult.error}`);
      throw new Error(`PAYMENT_DECLINED: ${paymentResult.error}`);
    }

    const order = await this.orderRepo.create({
      userId: dto.userId,
      totalAmount,
      status: 'PAID',
      transactionId: paymentResult.transactionId,
      items: dto.items,
    });

    return order;
  }

  /**
   * Computes tiered shipping rate based on destination and subtotal.
   */
  public calculateShippingCost(subtotal: number, address: string): number {
    if (subtotal > 150) {
      return 0; // Free shipping threshold
    }
    return address.toLowerCase().includes('intl') ? 25.0 : 8.5;
  }
}
""",
        "symbols": [
            {"name": "CreateOrderDTO", "kind": "interface", "line_start": 6, "line_end": 11, "calls": []},
            {"name": "OrderService", "kind": "class", "line_start": 13, "line_end": 68, "calls": ["OrderRepository", "PaymentGateway", "UserService"]},
            {"name": "createOrder", "kind": "method", "line_start": 29, "line_end": 57, "calls": ["UserService.getUserProfile", "PaymentGateway.chargeCustomer", "OrderRepository.create", "Logger.info", "Logger.error"]},
            {"name": "calculateShippingCost", "kind": "method", "line_start": 62, "line_end": 67, "calls": []}
        ],
        "dependencies": ["src/repositories/OrderRepository.ts", "src/services/PaymentGateway.ts", "src/services/UserService.ts", "src/utils/Logger.ts"],
        "dependents": ["src/controllers/OrderController.ts", "tests/services/OrderService.test.ts"]
    },

    "src/services/PaymentGateway.ts": {
        "layer": "service",
        "language": "typescript",
        "content": """import { Logger } from '../utils/Logger';

export interface ChargePayload {
  amount: number;
  currency: string;
  sourceToken: string;
  customerId: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export class PaymentGateway {
  private apiKey: string;
  private endpoint: string;

  constructor() {
    // Deliberate security smell: Hardcoded dev fallback API key
    this.apiKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_for_demo_purposes";
    this.endpoint = 'https://api.stripe.com/v1/charges';
  }

  public async chargeCustomer(payload: ChargePayload): Promise<PaymentResponse> {
    Logger.info(`Charging customer ${payload.customerId} amount ${payload.amount} ${payload.currency}`);

    if (payload.amount <= 0) {
      return { success: false, error: 'INVALID_CHARGE_AMOUNT' };
    }

    if (!payload.sourceToken) {
      return { success: false, error: 'MISSING_PAYMENT_METHOD_TOKEN' };
    }

    // Mock successful payment capture
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      success: true,
      transactionId,
    };
  }

  public async refundPayment(transactionId: string): Promise<boolean> {
    Logger.info(`Refunding transaction: ${transactionId}`);
    return true;
  }
}
""",
        "symbols": [
            {"name": "ChargePayload", "kind": "interface", "line_start": 3, "line_end": 8, "calls": []},
            {"name": "PaymentResponse", "kind": "interface", "line_start": 10, "line_end": 14, "calls": []},
            {"name": "PaymentGateway", "kind": "class", "line_start": 16, "line_end": 48, "calls": ["Logger.info"]},
            {"name": "chargeCustomer", "kind": "method", "line_start": 26, "line_end": 42, "calls": ["Logger.info"]},
            {"name": "refundPayment", "kind": "method", "line_start": 44, "line_end": 47, "calls": ["Logger.info"]}
        ],
        "dependencies": ["src/utils/Logger.ts"],
        "dependents": ["src/services/OrderService.ts"]
    },

    "src/controllers/OrderController.ts": {
        "layer": "presentation",
        "language": "typescript",
        "content": """import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/AuthMiddleware';
import { OrderService } from '../services/OrderService';
import { Logger } from '../utils/Logger';

export class OrderController {
  private orderService: OrderService;

  constructor(orderService?: OrderService) {
    this.orderService = orderService || new OrderService();
  }

  /**
   * POST /api/orders/checkout
   */
  public async checkout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { items, paymentToken, shippingAddress } = req.body;
      const userId = req.user?.id;

      if (!items || !items.length || !paymentToken) {
        res.status(400).json({ error: 'INVALID_ORDER_PAYLOAD' });
        return;
      }

      const order = await this.orderService.createOrder({
        userId,
        items,
        paymentToken,
        shippingAddress: shippingAddress || 'Domestic Standard',
      });

      res.status(201).json({ success: true, order });
    } catch (error: any) {
      Logger.error(`Checkout error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
}
""",
        "symbols": [
            {"name": "OrderController", "kind": "class", "line_start": 6, "line_end": 39, "calls": ["OrderService.createOrder", "Logger.error"]},
            {"name": "checkout", "kind": "method", "line_start": 16, "line_end": 38, "calls": ["OrderService.createOrder", "Logger.error"]}
        ],
        "dependencies": ["src/middleware/AuthMiddleware.ts", "src/services/OrderService.ts", "src/utils/Logger.ts"],
        "dependents": []
    },

    "src/repositories/OrderRepository.ts": {
        "layer": "repository",
        "language": "typescript",
        "content": """import { Database } from '../database/Database';
import { Order } from '../models/Order';

export class OrderRepository {
  private db: Database;

  constructor(db?: Database) {
    this.db = db || Database.getInstance();
  }

  public async create(data: Partial<Order>): Promise<Order> {
    const sql = `
      INSERT INTO orders (user_id, total_amount, status, transaction_id, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;
    const rows = await this.db.query(sql, [
      data.userId,
      data.totalAmount,
      data.status,
      data.transactionId,
    ]);
    return rows[0];
  }

  public async findByUserId(userId: string): Promise<Order[]> {
    const sql = 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
    return await this.db.query(sql, [userId]);
  }
}
""",
        "symbols": [
            {"name": "OrderRepository", "kind": "class", "line_start": 4, "line_end": 30, "calls": ["Database.getInstance", "Database.query"]},
            {"name": "create", "kind": "method", "line_start": 11, "line_end": 24, "calls": ["Database.query"]},
            {"name": "findByUserId", "kind": "method", "line_start": 26, "line_end": 29, "calls": ["Database.query"]}
        ],
        "dependencies": ["src/database/Database.ts", "src/models/Order.ts"],
        "dependents": ["src/services/OrderService.ts"]
    },

    "src/database/Database.ts": {
        "layer": "database",
        "language": "typescript",
        "content": """import { Logger } from '../utils/Logger';

export class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {
    this.connect();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private connect(): void {
    Logger.info('Initializing PostgreSQL connection pool on pool-01.db.internal');
    this.isConnected = true;
  }

  /**
   * Executes parameterized database queries with connection management.
   */
  public async query(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error('DATABASE_NOT_CONNECTED');
    }
    // Mock database query simulation
    return [{ id: 'mock-uuid-1', name: 'John Doe', email: 'john@example.com', isActive: true, role: 'admin' }];
  }

  /**
   * Potentially dangerous helper: Raw string query execution without parameter escaping.
   * Deliberate SQL injection pattern for code smell and security audit detection.
   */
  public async executeRawUnsafeQuery(rawSql: string): Promise<any> {
    Logger.warn('Executing raw unescaped query string');
    return [];
  }
}
""",
        "symbols": [
            {"name": "Database", "kind": "class", "line_start": 3, "line_end": 41, "calls": ["Logger.info", "Logger.warn"]},
            {"name": "getInstance", "kind": "method", "line_start": 11, "line_end": 16, "calls": []},
            {"name": "connect", "kind": "method", "line_start": 18, "line_end": 21, "calls": ["Logger.info"]},
            {"name": "query", "kind": "method", "line_start": 26, "line_end": 32, "calls": []},
            {"name": "executeRawUnsafeQuery", "kind": "method", "line_start": 38, "line_end": 40, "calls": ["Logger.warn"]}
        ],
        "dependencies": ["src/utils/Logger.ts"],
        "dependents": ["src/repositories/UserRepository.ts", "src/repositories/OrderRepository.ts"]
    },

    "src/models/User.ts": {
        "layer": "model",
        "language": "typescript",
        "content": """export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'customer' | 'support';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
""",
        "symbols": [
            {"name": "User", "kind": "interface", "line_start": 1, "line_end": 11, "calls": []}
        ],
        "dependencies": [],
        "dependents": ["src/repositories/UserRepository.ts"]
    },

    "src/models/Order.ts": {
        "layer": "model",
        "language": "typescript",
        "content": """export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  userId: string;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'CANCELLED';
  transactionId?: string;
  items: OrderItem[];
  createdAt: Date;
}
""",
        "symbols": [
            {"name": "OrderItem", "kind": "interface", "line_start": 1, "line_end": 5, "calls": []},
            {"name": "Order", "kind": "interface", "line_start": 7, "line_end": 15, "calls": []}
        ],
        "dependencies": [],
        "dependents": ["src/repositories/OrderRepository.ts"]
    },

    "src/utils/Logger.ts": {
        "layer": "utility",
        "language": "typescript",
        "content": """export class Logger {
  public static info(message: string, meta?: any): void {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  public static warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  }

  public static error(message: string, meta?: any): void {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, meta || '');
  }
}
""",
        "symbols": [
            {"name": "Logger", "kind": "class", "line_start": 1, "line_end": 13, "calls": []},
            {"name": "info", "kind": "method", "line_start": 2, "line_end": 4, "calls": []},
            {"name": "warn", "kind": "method", "line_start": 6, "line_end": 8, "calls": []},
            {"name": "error", "kind": "method", "line_start": 10, "line_end": 12, "calls": []}
        ],
        "dependencies": [],
        "dependents": ["src/auth/TokenService.ts", "src/auth/AuthService.ts", "src/services/OrderService.ts", "src/database/Database.ts"]
    },

    "tests/auth/AuthService.test.ts": {
        "layer": "test",
        "language": "typescript",
        "content": """import { AuthService } from '../../src/auth/AuthService';
import { TokenService } from '../../src/auth/TokenService';

describe('AuthService Suite', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should authenticate valid credentials and issue tokens', async () => {
    // Test login authentication
    expect(authService).toBeDefined();
  });

  it('should reject invalid password hash with INVALID_CREDENTIALS', async () => {
    // Assert error thrown
  });

  it('should validate active token correctly', async () => {
    // Validates active session
  });
});
""",
        "symbols": [
            {"name": "AuthService.test", "kind": "function", "line_start": 4, "line_end": 22, "calls": ["AuthService.login", "AuthService.validateToken"]}
        ],
        "dependencies": ["src/auth/AuthService.ts", "src/auth/TokenService.ts"],
        "dependents": []
    },

    "tests/controllers/AuthController.test.ts": {
        "layer": "test",
        "language": "typescript",
        "content": """import { AuthController } from '../../src/controllers/AuthController';

describe('AuthController Endpoints', () => {
  it('handles /api/auth/login with 200 on valid credentials', async () => {
    // Integration test for login controller
  });

  it('returns 400 when missing credentials', async () => {
    // Integration test bad request
  });
});
""",
        "symbols": [
            {"name": "AuthController.test", "kind": "function", "line_start": 3, "line_end": 11, "calls": ["AuthController.login"]}
        ],
        "dependencies": ["src/controllers/AuthController.ts"],
        "dependents": []
    },

    "tests/services/OrderService.test.ts": {
        "layer": "test",
        "language": "typescript",
        "content": """import { OrderService } from '../../src/services/OrderService';

describe('OrderService Checkout Flow', () => {
  it('calculates free shipping for orders exceeding $150', () => {
    const svc = new OrderService();
    const cost = svc.calculateShippingCost(160, '123 Main St');
    expect(cost).toBe(0);
  });

  it('calculates standard domestic shipping for normal carts', () => {
    const svc = new OrderService();
    const cost = svc.calculateShippingCost(50, '123 Main St');
    expect(cost).toBe(8.5);
  });
});
""",
        "symbols": [
            {"name": "OrderService.test", "kind": "function", "line_start": 3, "line_end": 16, "calls": ["OrderService.calculateShippingCost"]}
        ],
        "dependencies": ["src/services/OrderService.ts"],
        "dependents": []
    }
}
