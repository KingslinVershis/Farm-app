import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { getServerAuthenticatedUser } from '@/lib/serverAuth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

/**
 * POST /api/user/avatar
 * Handles multipart/form-data image upload or JSON payload, saves image to /public/uploads/avatars,
 * updates users_table.avatar_url, and returns the updated user avatar URL.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getServerAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
    }

    const userId = String(authUser.id);
    const contentType = req.headers.get('content-type') || '';
    let avatarUrl = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'No image file uploaded' },
          { status: 400 }
        );
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'Only image files (JPEG, PNG, WEBP, GIF) are allowed' },
          { status: 400 }
        );
      }

      // Limit file size to 5MB
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: 'File size must not exceed 5MB' },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Determine file extension
      let ext = 'jpg';
      if (file.type.includes('png')) ext = 'png';
      else if (file.type.includes('webp')) ext = 'webp';
      else if (file.type.includes('gif')) ext = 'gif';
      else if (file.type.includes('jpeg') || file.type.includes('jpg')) ext = 'jpg';

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, fileName);

      await fs.promises.writeFile(filePath, buffer);
      avatarUrl = `/uploads/avatars/${fileName}`;
    } else {
      // JSON body
      const body = await req.json().catch(() => ({}));
      if (body.avatar_url) {
        avatarUrl = String(body.avatar_url).trim();
      } else if (body.imageBase64) {
        const matches = String(body.imageBase64).match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
          await fs.promises.mkdir(uploadDir, { recursive: true });

          const fileName = `avatar-${userId}-${Date.now()}.${ext}`;
          const filePath = path.join(uploadDir, fileName);
          await fs.promises.writeFile(filePath, buffer);
          avatarUrl = `/uploads/avatars/${fileName}`;
        } else {
          avatarUrl = String(body.imageBase64);
        }
      } else {
        return NextResponse.json(
          { success: false, error: 'No avatar image or data provided' },
          { status: 400 }
        );
      }
    }

    // Update users_table in PostgreSQL
    const updateResult = await pool.query(
      `UPDATE users_table
       SET avatar_url = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, username, email, role, avatar_url`,
      [avatarUrl, userId]
    );

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
      user: updateResult.rows[0],
    });
  } catch (err: any) {
    console.error('[API /api/user/avatar] Error uploading avatar:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to upload user avatar' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/avatar
 * Removes the user's avatar from users_table.
 */
export async function DELETE(req: NextRequest) {
  try {
    const authUser = await getServerAuthenticatedUser(req);
    if (!authUser || !authUser.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid authentication required' },
        { status: 401 }
      );
    }

    const userId = String(authUser.id);

    await pool.query(
      `UPDATE users_table
       SET avatar_url = NULL, updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    return NextResponse.json({
      success: true,
      avatar_url: null,
    });
  } catch (err: any) {
    console.error('[API DELETE /api/user/avatar] Error removing avatar:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to remove avatar' },
      { status: 500 }
    );
  }
}

