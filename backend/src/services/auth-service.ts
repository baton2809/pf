import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { database } from './database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  google_id?: string;
  avatar_url?: string;
  created_at: Date;
  updated_at: Date;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string;
    avatar_url?: string;
  };
  token: string;
}

export class AuthService {
  private oauth2Client;
  private database: typeof database;
  private jwtSecret: string;

  constructor(databaseInstance: typeof database) {
    this.database = databaseInstance;
    this.jwtSecret = process.env.JWT_SECRET!;

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    logger.info('AuthService', 'initialized', {
      hasGoogleClientId: !!clientId,
      hasGoogleClientSecret: !!clientSecret,
      redirectUri,
      hasJwtSecret: !!process.env.JWT_SECRET
    });
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    const redirectUri = process.env.GOOGLE_REDIRECT_URI;
    logger.info('AuthService', 'generating auth url with redirect', { 
      redirectUri,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET
    });

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: uuidv4(), // csrf protection
      redirect_uri: redirectUri // explicitly set redirect_uri
    });

    logger.info('AuthService', 'generated auth url', { 
      hasUrl: !!authUrl,
      urlLength: authUrl?.length,
      includesRedirect: authUrl?.includes('redirect_uri')
    });
    return authUrl;
  }

  async handleGoogleCallback(code: string, state?: string): Promise<AuthResult> {
    try {
      logger.info('AuthService', 'handling Google callback', { hasCode: !!code, hasState: !!state });

      // exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new Error('no access token received from Google');
      }

      // set credentials to get user info
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      
      // get user information
      const { data: userInfo } = await oauth2.userinfo.get();
      
      if (!userInfo.email) {
        throw new Error('email not provided by Google');
      }

      logger.info('AuthService', 'got user info from Google', { 
        email: userInfo.email,
        hasName: !!userInfo.name,
        hasPicture: !!userInfo.picture
      });

      // check if user exists
      let user = await this.findUserByEmail(userInfo.email);

      // create user if doesn't exist
      if (!user) {
        user = await this.createUser({
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          google_id: userInfo.id || undefined,
          avatar_url: userInfo.picture || undefined
        });
        logger.info('AuthService', 'created new user', { userId: user.id, email: user.email });
      } else {
        // update user info
        user = await this.updateUser(user.id, {
          name: userInfo.name || user.name,
          google_id: userInfo.id || undefined,
          avatar_url: userInfo.picture || user.avatar_url || undefined
        });
        logger.info('AuthService', 'updated existing user', { userId: user.id, email: user.email });
      }

      // generate jwt
      const token = this.generateJWT(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url
        },
        token
      };

    } catch (error: any) {
      logger.error('AuthService', 'Google OAuth error', error);
      throw new Error(`failed to authenticate with Google: ${error.message}`);
    }
  }

  async verifyJWT(token: string): Promise<{ userId: string; email: string }> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any;
      return {
        userId: decoded.userId,
        email: decoded.email
      };
    } catch (error: any) {
      logger.debug('AuthService', 'JWT verification failed', { error: error.message });
      throw new Error('invalid JWT token');
    }
  }

  generateJWT(userId: string, email: string): string {
    const payload = {
      userId,
      email,
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };
    return jwt.sign(payload, this.jwtSecret);
  }

  // database operations
  private async findUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await this.database.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('AuthService', 'failed to find user by email', error);
      throw error;
    }
  }

  private async createUser(userData: {
    email: string;
    name: string;
    google_id?: string;
    avatar_url?: string;
  }): Promise<User> {
    try {
      const result = await this.database.query(
        `INSERT INTO users (email, name, google_id, avatar_url) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [userData.email, userData.name, userData.google_id, userData.avatar_url]
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error('AuthService', 'failed to create user', error);
      throw error;
    }
  }

  private async updateUser(userId: string, userData: {
    name?: string;
    google_id?: string;
    avatar_url?: string;
  }): Promise<User> {
    try {
      const result = await this.database.query(
        `UPDATE users 
         SET name = COALESCE($2, name),
             google_id = COALESCE($3, google_id),
             avatar_url = COALESCE($4, avatar_url),
             updated_at = NOW()
         WHERE id = $1 
         RETURNING *`,
        [userId, userData.name, userData.google_id, userData.avatar_url]
      );
      return result.rows[0];
    } catch (error: any) {
      logger.error('AuthService', 'failed to update user', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.database.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );
      return result.rows[0] || null;
    } catch (error: any) {
      logger.error('AuthService', 'failed to get user by id', error);
      throw error;
    }
  }
}