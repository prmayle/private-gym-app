import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    console.log('📁 LOCAL FILE UPLOAD API - START');
    
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
    
    // Create directory path
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'home-config');
    
    // Ensure directory exists
    if (!existsSync(uploadDir)) {
      console.log('📁 Creating upload directory:', uploadDir);
      await mkdir(uploadDir, { recursive: true });
    }

    // Full file path
    const filePath = join(uploadDir, fileName);
    
    // Convert file to buffer and write to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    console.log('💾 Writing file to:', filePath);
    await writeFile(filePath, buffer);
    
    // Return the public URL path (relative to public folder)
    const publicPath = `/uploads/home-config/${fileName}`;
    
    console.log('✅ File uploaded successfully:', publicPath);
    
    return NextResponse.json({ 
      success: true, 
      filePath: publicPath,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}