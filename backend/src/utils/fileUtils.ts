import path from 'path';
import fs from 'fs/promises';
import { MultipartFile } from '@fastify/multipart';

// allowed file extensions and mime types
const ALLOWED_EXTENSIONS = ['.wav', '.mp3', '.m4a', '.ogg'] as const;
const ALLOWED_MIME_TYPES = [
  'audio/wav', 
  'audio/mpeg', 
  'audio/mp4', 
  'audio/ogg'
] as const;

// max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export interface FileValidationError {
  code: string;
  message: string;
}

export interface ValidatedFile {
  sessionId: string;
  originalFilename: string;
  sanitizedFilename: string;
  fullPath: string;
  size: number;
}

// sanitize filename - remove dangerous characters
export function sanitizeFilename(filename: string): string {
  // remove path separators and dangerous characters
  const sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // replace dangerous chars
    .replace(/\.{2,}/g, '.') // remove multiple dots
    .replace(/^\.+/, '') // remove leading dots
    .substring(0, 100); // limit length
  
  // ensure it has a valid extension
  const ext = path.extname(sanitized).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
    return sanitized + '.wav'; // default extension
  }
  
  return sanitized;
}

// validate uploaded file
export function validateFile(file: MultipartFile): FileValidationError | null {
  // check file size
  if (file.file.bytesRead > MAX_FILE_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    };
  }
  
  // check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
    return {
      code: 'INVALID_FILE_TYPE',
      message: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    };
  }
  
  // check filename
  if (!file.filename || file.filename.length === 0) {
    return {
      code: 'MISSING_FILENAME',
      message: 'Filename is required'
    };
  }
  
  if (file.filename.length > 100) {
    return {
      code: 'FILENAME_TOO_LONG',
      message: 'Filename is too long (max 100 characters)'
    };
  }
  
  return null;
}

// ensure upload directory exists
export async function ensureUploadDirectory(uploadDir: string): Promise<void> {
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
}

// create safe file path
export function createSafeFilePath(
  uploadDir: string, 
  sessionId: string, 
  originalFilename: string
): ValidatedFile {
  const sanitizedFilename = sanitizeFilename(originalFilename);
  const filename = `${sessionId}_${sanitizedFilename}`;
  const fullPath = path.resolve(uploadDir, filename);
  
  // ensure the resolved path is within upload directory (prevent path traversal)
  const resolvedUploadDir = path.resolve(uploadDir);
  if (!fullPath.startsWith(resolvedUploadDir)) {
    throw new Error('Invalid file path detected');
  }
  
  return {
    sessionId,
    originalFilename,
    sanitizedFilename,
    fullPath,
    size: 0 // will be set after file is written
  };
}

// save file securely
export async function saveFileSecurely(
  file: MultipartFile, 
  filePath: string
): Promise<number> {
  const buffer = await file.toBuffer();
  await fs.writeFile(filePath, buffer, { mode: 0o644 }); // set safe file permissions
  return buffer.length;
}