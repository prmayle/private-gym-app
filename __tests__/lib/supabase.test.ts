import {
  getUserProfile,
  getMemberProfile,
  getActivePackages,
  updateSectionContent,
  upsertFeature,
  upsertTestimonial,
} from '@/lib/supabase'
import { createMockSupabaseClient, mockProfile, mockMember } from '../__mocks__/supabase'

describe('Database Helper Functions', () => {
  let mockClient: ReturnType<typeof createMockSupabaseClient>

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    jest.clearAllMocks()
  })

  describe('getUserProfile', () => {
    it('should fetch user profile successfully', async () => {
      const result = await getUserProfile(mockClient as any, 'test-user-id')
      
      expect(mockClient.from).toHaveBeenCalledWith('profiles')
      expect(result).toEqual(mockProfile)
    })

    it('should throw error when profile fetch fails', async () => {
      mockClient.from = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Profile not found' } }),
      }))

      await expect(getUserProfile(mockClient as any, 'invalid-id')).rejects.toThrow()
    })
  })

  describe('getMemberProfile', () => {
    it('should fetch member profile successfully', async () => {
      const result = await getMemberProfile(mockClient as any, 'test-user-id')
      
      expect(mockClient.from).toHaveBeenCalledWith('members')
      expect(result).toEqual(mockMember)
    })

    it('should throw error when member profile fetch fails', async () => {
      mockClient.from = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Member not found' } }),
      }))

      await expect(getMemberProfile(mockClient as any, 'invalid-id')).rejects.toThrow()
    })
  })

  describe('getActivePackages', () => {
    it('should fetch active packages successfully', async () => {
      const mockPackages = [
        { id: '1', name: 'Basic', price: 50, is_active: true },
        { id: '2', name: 'Premium', price: 100, is_active: true },
      ]

      mockClient.from = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: mockPackages, error: null }),
      }))

      const result = await getActivePackages(mockClient as any)
      
      expect(mockClient.from).toHaveBeenCalledWith('packages')
      expect(result).toEqual(mockPackages)
    })

    it('should return empty array when no packages found', async () => {
      mockClient.from = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: null, error: null }),
      }))

      const result = await getActivePackages(mockClient as any)
      
      expect(result).toEqual([])
    })
  })

  describe('updateSectionContent', () => {
    it('should update section content successfully', async () => {
      const mockSectionContent = { title: 'Test Section', subtitle: 'Test Description' }
      
      // Mock the complex chain of calls
      let callCount = 0
      mockClient.from = jest.fn().mockImplementation((table: string) => {
        callCount++
        
        if (table === 'pages') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ 
              data: { id: 'home-page-id' }, 
              error: null 
            }),
          }
        }
        
        if (table === 'sections') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ 
              data: { id: 'section-id' }, 
              error: null 
            }),
          }
        }
        
        if (table === 'page_sections') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ 
              data: { id: 'page-section-id' }, 
              error: null 
            }),
            update: jest.fn().mockReturnThis(),
            select: jest.fn().mockResolvedValue({ 
              data: [{ id: 'updated-page-section' }], 
              error: null 
            }),
          }
        }
        
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
      })

      const result = await updateSectionContent(mockClient as any, 'hero', mockSectionContent)
      
      expect(mockClient.from).toHaveBeenCalledWith('pages')
      expect(mockClient.from).toHaveBeenCalledWith('sections')
      expect(mockClient.from).toHaveBeenCalledWith('page_sections')
    })
  })

  describe('upsertFeature', () => {
    it('should create new feature successfully', async () => {
      const mockFeature = {
        title: 'Test Feature',
        description: 'Test Description',
        icon: 'test-icon',
        sort_order: 1,
      }

      mockClient.from = jest.fn().mockImplementation(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ 
          data: [{ id: 'new-feature-id', ...mockFeature }], 
          error: null 
        }),
      }))

      const result = await upsertFeature(mockClient as any, mockFeature)
      
      expect(mockClient.from).toHaveBeenCalledWith('features')
      expect(result).toEqual([{ id: 'new-feature-id', ...mockFeature }])
    })

    it('should update existing feature successfully', async () => {
      const mockFeature = {
        id: 'existing-feature-id',
        title: 'Updated Feature',
        description: 'Updated Description',
        icon: 'updated-icon',
        sort_order: 2,
      }

      mockClient.from = jest.fn().mockImplementation(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ 
          data: [mockFeature], 
          error: null 
        }),
      }))

      const result = await upsertFeature(mockClient as any, mockFeature)
      
      expect(result).toEqual([mockFeature])
    })
  })

  describe('upsertTestimonial', () => {
    it('should create new testimonial successfully', async () => {
      const mockTestimonial = {
        name: 'John Doe',
        role: 'Member',
        content: 'Great gym!',
        image_url: 'https://example.com/image.jpg',
        sort_order: 1,
      }

      mockClient.from = jest.fn().mockImplementation(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ 
          data: [{ id: 'new-testimonial-id', ...mockTestimonial }], 
          error: null 
        }),
      }))

      const result = await upsertTestimonial(mockClient as any, mockTestimonial)
      
      expect(mockClient.from).toHaveBeenCalledWith('testimonials')
      expect(result).toEqual([{ id: 'new-testimonial-id', ...mockTestimonial }])
    })

    it('should handle testimonial upsert errors', async () => {
      const mockTestimonial = {
        name: 'John Doe',
        role: 'Member',
        content: 'Great gym!',
      }

      mockClient.from = jest.fn().mockImplementation(() => ({
        upsert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Upsert failed' }
        }),
      }))

      await expect(upsertTestimonial(mockClient as any, mockTestimonial)).rejects.toThrow('Failed to upsert testimonial')
    })
  })
})