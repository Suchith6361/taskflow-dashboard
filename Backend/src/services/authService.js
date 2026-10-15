import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";

const BCRYPT_ROUNDS = 12;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email };
}

function issueToken(userId, secret) {
  return jwt.sign({}, secret, {
    algorithm: "HS256",
    subject: String(userId),
    expiresIn: "1h",
  });
}

export function createAuthService(pool, jwtSecret) {
  return {
    async register({ name, email, password }) {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      let result;
      try {
        [result] = await pool.execute(
          "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
          [name, email, passwordHash],
        );
      } catch (error) {
        if (error?.code === "ER_DUP_ENTRY") {
          throw new ApiError(409, "EMAIL_IN_USE", "An account with that email already exists.");
        }
        throw error;
      }
      const user = { id: result.insertId, name, email };
      return { user, token: issueToken(user.id, jwtSecret) };
    },

    async login({ email, password }) {
      const [rows] = await pool.execute(
        "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
        [email],
      );
      const user = rows[0];
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
      }
      return { user: publicUser(user), token: issueToken(user.id, jwtSecret) };
    },

    async getCurrentUser(userId) {
      const [rows] = await pool.execute(
        "SELECT id, name, email, created_at AS createdAt FROM users WHERE id = ? LIMIT 1",
        [userId],
      );
      if (!rows[0]) throw new ApiError(404, "NOT_FOUND", "The requested resource was not found.");
      return rows[0];
    },
  };
}
