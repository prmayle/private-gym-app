import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    console.log('📁 VERCEL BLOB UPLOAD API - START');
    
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const section = formData.get('section') as string;
    const field = formData.get('field') as string;
    const testimonialId = formData.get('testimonialId') as string;

    console.log('📋 Upload details:', { 
      fileName: file?.name, 
      size: file?.size, 
      section, 
      field, 
      testimonialId 
    });

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed.' }, { status: 400 });
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${section}-${field}-${Date.now()}.${fileExt}`;
    
    console.log('☁️ Uploading to Vercel Blob with filename:', fileName);
    
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      handleUploadUrl: '/api/upload',
    });
    
    console.log('✅ File uploaded successfully to Vercel Blob:', blob.url);
    
    return NextResponse.json({ 
      success: true, 
      filePath: blob.url,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
      blobUrl: blob.url
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}