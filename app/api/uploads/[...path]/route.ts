import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    console.log('🖼️ Serving uploaded image:', params.path);
    
    // Construct the file path
    const filePath = join(process.cwd(), 'public', 'uploads', ...params.path);
    
    console.log('📁 Looking for file at:', filePath);
    
    // Check if file exists
    if (!existsSync(filePath)) {
      console.log('❌ File not found:', filePath);
      return new NextResponse('File not found', { status: 404 });
    }
    
    // Read the file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on file extension
    const ext = params.path[params.path.length - 1].split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }
    
    console.log('✅ Serving file with content type:', contentType);
    
    // Return the file with appropriate headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
    
  } catch (error) {
    console.error('❌ Error serving uploaded file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}