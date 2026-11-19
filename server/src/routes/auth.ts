
import { Router, type Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth.js';
import { CategoryModel } from '../models/Category.js';

export const authRouter = Router();

const DEFAULT_CATEGORIES = [
  ...[
    'Food',
    'Groceries',
    'Transport',
    'Shopping',
    'Bills',
    'Entertainment',
    'Health',
    'Education',
    'Travel',
    'Rent',
    'EMI',
    'Other',
  ].map((name) => ({ name, type: 'DEBIT' as const })),

  ...['Salary', 'Business', 'Investments', 'Other income'].map((name) => ({
    name,
    type: 'CREDIT' as const,
  })),
];

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(72),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});

function tokenFor(id: string) {
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign(
    { sub: id },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    },
  );
}

/**
 * Detect duplicate-key errors from MongoDB bulkWrite.
 * MongoDB may report them at the top level or inside writeErrors.
 */
function isDuplicateKeyBulkError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    writeErrors?: Array<{ code?: unknown }>;
  };

  if (candidate.code === 11000) {
    return true;
  }

  return (
    Array.isArray(candidate.writeErrors) &&
    candidate.writeErrors.length > 0 &&
    candidate.writeErrors.every(
      (writeError) => writeError.code === 11000,
    )
  );
}

/**
 * Seed default categories idempotently.
 * Handles concurrent registration attempts and duplicate-key conflicts.
 */
async function ensureDefaultCategories(userId: string) {
  const operations = DEFAULT_CATEGORIES.map((category) => ({
    updateOne: {
      filter: {
        ownerUserId: userId,
        name: category.name,
      },
      update: {
        $setOnInsert: {
          ...category,
          ownerUserId: userId,
          isDefault: true,
        },
      },
      upsert: true,
    },
  }));

  try {
    await CategoryModel.bulkWrite(operations, {
      ordered: false,
    });
  } catch (error) {
    if (!isDuplicateKeyBulkError(error)) {
      throw error;
    }

    // Retry idempotent upserts after a concurrent duplicate-key conflict.
    await CategoryModel.bulkWrite(operations, {
      ordered: false,
    });
  }
}

/**
 * Common registration response.
 */
function registrationResponse(
  res: Response,
  user: { _id: unknown; name: string; email: string },
  status: number,
  isNewAccount: boolean,
) {
  const id = String(user._id);

  return res.status(status).json({
    token: tokenFor(id),
    user: {
      id,
      name: user.name,
      email: user.email,
    },
    isNewAccount,
  });
}

/**
 * REGISTER
 */
authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const email = input.email.toLowerCase();

    // Check whether this account already exists.
    let user = await User.findOne({ email }).select('+passwordHash');

    if (user) {
      const passwordMatches = await bcrypt.compare(
        input.password,
        user.passwordHash,
      );

      if (!passwordMatches) {
        return res.status(409).json({
          error: 'EMAIL_EXISTS',
          message:
            'An account with this email already exists. Please log in instead.',
        });
      }

      // Recover registration if the account exists but categories
      // were not initialized successfully.
      await ensureDefaultCategories(String(user._id));

      return registrationResponse(res, user, 200, false);
    }

    // Create a new account.
    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      user = await User.create({
        name: input.name,
        email,
        passwordHash,
      });
    } catch (error) {
      // Handle simultaneous registration requests.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        const existing = await User.findOne({ email }).select(
          '+passwordHash',
        );

        if (
          existing &&
          await bcrypt.compare(input.password, existing.passwordHash)
        ) {
          await ensureDefaultCategories(String(existing._id));

          return registrationResponse(
            res,
            existing,
            200,
            false,
          );
        }

        return res.status(409).json({
          error: 'EMAIL_EXISTS',
          message:
            'An account with this email already exists. Please log in instead.',
        });
      }

      throw error;
    }

    // Initialize default categories for the new account.
    try {
      await ensureDefaultCategories(String(user._id));
    } catch (error) {
      // Clean up only this newly created user's records if setup fails.
      await CategoryModel.deleteMany({
        ownerUserId: String(user._id),
      }).catch((cleanupError) => {
        console.error(
          'Registration category cleanup failed:',
          cleanupError instanceof Error
            ? cleanupError.message
            : 'Unknown error',
        );
      });

      await User.deleteOne({
        _id: user._id,
      }).catch((cleanupError) => {
        console.error(
          'Registration user cleanup failed:',
          cleanupError instanceof Error
            ? cleanupError.message
            : 'Unknown error',
        );
      });

      throw error;
    }

    return registrationResponse(res, user, 201, true);
  } catch (error) {
    return next(error);
  }
});

/**
 * LOGIN
 */
authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await User.findOne({
      email: input.email.toLowerCase(),
    }).select('+passwordHash');

    if (
      !user ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Email or password is incorrect.',
      });
    }

    return res.json({
      token: tokenFor(String(user._id)),
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * GET CURRENT USER
 */
authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const userId = (req as AuthenticatedRequest).authUserId;

    const user = await User.findById(userId)
      .select('_id name email')
      .lean();

    if (!user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Your account no longer exists.',
      });
    }

    return res.json({
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * UPDATE PROFILE
 */
const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254),
});

authRouter.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const input = profileUpdateSchema.parse(req.body);
    const userId = (req as AuthenticatedRequest).authUserId;
    const email = input.email.toLowerCase();

    const duplicate = await User.findOne({
      email,
      _id: { $ne: userId },
    })
      .select('_id')
      .lean();

    if (duplicate) {
      return res.status(409).json({
        error: 'EMAIL_EXISTS',
        message:
          'That email address is already used by another SpendSense account.',
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          name: input.name,
          email,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .select('_id name email')
      .lean();

    if (!user) {
      return res.status(404).json({
        error: 'USER_NOT_FOUND',
        message: 'Your account could not be found.',
      });
    }

    return res.json({
      data: {
        id: String(user._id),
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    return next(error);
  }
});
