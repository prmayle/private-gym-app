/**
 * @jest-environment node
 */

import { POST } from '@/app/api/upload/route'
import { NextRequest } from 'next/server'

// Mock the Vercel Blob
jest.mock('@vercel/blob', () => ({
  put: jest.fn(),
}))

// Mock the createClient function
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  })),
}))

describe('/api/upload', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should upload file successfully', async () => {
    const { put } = require('@vercel/blob')
    put.mockResolvedValue({
      url: 'https://test-blob-url.com/home-config-hero-12345.jpg',
    })

    const mockFile = new File(['test content'], 'test-file.jpg', {
      type: 'image/jpeg',
    })

    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('section', 'home-config')
    formData.append('field', 'hero')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('blobUrl')
    expect(data).toHaveProperty('fileName')
    expect(data).toHaveProperty('originalName', 'test-file.jpg')
    expect(put).toHaveBeenCalledWith(
      expect.stringMatching(/home-config-hero-\d+\.jpg/),
      expect.any(File),
      expect.objectContaining({
        access: 'public',
        handleUploadUrl: '/api/upload',
      })
    )
  })

  it('should validate file size limit', async () => {
    const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB file
    const mockFile = new File([largeContent], 'large-file.jpg', {
      type: 'image/jpeg',
    })

    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('section', 'test')
    formData.append('field', 'image')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error', 'File too large. Maximum size is 5MB.')
  })

  it('should reject upload without file', async () => {
    const formData = new FormData()

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error', 'No file provided')
  })

  it('should handle upload errors gracefully', async () => {
    const { put } = require('@vercel/blob')
    put.mockRejectedValue(new Error('Upload failed'))

    const mockFile = new File(['test content'], 'test-file.jpg', {
      type: 'image/jpeg',
    })

    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('category', 'test-category')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toHaveProperty('error', 'Upload failed')
  })

  it('should validate file types', async () => {
    const mockFile = new File(['test content'], 'test-file.txt', {
      type: 'text/plain',
    })

    const formData = new FormData()
    formData.append('file', mockFile)
    formData.append('section', 'test')
    formData.append('field', 'image')

    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toHaveProperty('error', 'Invalid file type. Only images are allowed.')
  })
})