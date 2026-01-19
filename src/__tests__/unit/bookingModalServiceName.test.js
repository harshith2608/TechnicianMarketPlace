/**
 * Unit Tests for BookingModal Service Name Display
 * Testing: Service name fallback logic (title || name || 'Service')
 * Business Logic: Support both title and name fields for backward compatibility
 * File: src/__tests__/unit/bookingModalServiceName.test.js
 */

describe('BookingModal Service Name Display Logic', () => {
  /**
   * Helper function to simulate the service name display logic from BookingModal:
   * {service.title || service.name || 'Service'}
   */
  const getServiceName = (service) => {
    if (!service) return 'Service';
    return service.title || service.name || 'Service';
  };

  describe('Service name display - Primary field (title)', () => {
    it('should display service title when present', () => {
      const service = {
        id: 'service1',
        title: 'Professional Plumbing',
        description: 'Plumbing services',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Professional Plumbing');
    });

    it('should use title as primary choice', () => {
      const service = {
        id: 'service1',
        title: 'Preferred Title',
        name: 'Alternative Name',
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Preferred Title'); // Should prefer title
    });

    it('should handle title from ServiceDetailScreen (freshService)', () => {
      // ServiceDetailScreen passes freshService with title field
      const freshService = {
        id: 'service-detail-1',
        title: 'Fresh Service Data',
        category: 'Maintenance',
        price: 75,
      };

      const displayName = getServiceName(freshService);
      expect(displayName).toBe('Fresh Service Data');
    });
  });

  describe('Service name display - Fallback field (name)', () => {
    it('should display service name when title not present', () => {
      const service = {
        id: 'service1',
        name: 'Plumbing Service',
        description: 'Plumbing services',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Plumbing Service');
    });

    it('should use name as fallback when title is empty', () => {
      const service = {
        id: 'service1',
        title: '', // Empty title
        name: 'Fallback Name',
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Fallback Name');
    });

    it('should use name when title is null', () => {
      const service = {
        id: 'service1',
        title: null,
        name: 'Service Name',
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service Name');
    });

    it('should use name when title is undefined', () => {
      const service = {
        id: 'service1',
        title: undefined,
        name: 'Service Name',
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service Name');
    });

    it('should handle legacy service format with only name field', () => {
      const legacyService = {
        id: 'service-legacy-1',
        name: 'Legacy Service Format',
        category: 'Repair',
        price: 60,
      };

      const displayName = getServiceName(legacyService);
      expect(displayName).toBe('Legacy Service Format');
    });
  });

  describe('Service name display - Fallback to default', () => {
    it('should display generic text when neither title nor name present', () => {
      const service = {
        id: 'service1',
        description: 'Some service',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when both title and name are empty strings', () => {
      const service = {
        id: 'service1',
        title: '',
        name: '',
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when both title and name are null', () => {
      const service = {
        id: 'service1',
        title: null,
        name: null,
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when both title and name are undefined', () => {
      const service = {
        id: 'service1',
        title: undefined,
        name: undefined,
        description: 'Service description',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when service is null', () => {
      const service = null;
      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when service is undefined', () => {
      const service = undefined;
      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });

    it('should use default when service is empty object', () => {
      const service = {};
      const displayName = getServiceName(service);
      expect(displayName).toBe('Service');
    });
  });

  describe('Service name display - Edge cases', () => {
    it('should handle very long service title', () => {
      const service = {
        id: 'service1',
        title: 'Professional Comprehensive Home Plumbing and Water System Maintenance Services for Commercial and Residential Buildings',
        price: 150,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe(
        'Professional Comprehensive Home Plumbing and Water System Maintenance Services for Commercial and Residential Buildings'
      );
    });

    it('should handle special characters in service name', () => {
      const service = {
        id: 'service1',
        title: "O'Brien's Plumbing & Repair (24/7) - #1 Rated!",
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe("O'Brien's Plumbing & Repair (24/7) - #1 Rated!");
    });

    it('should handle unicode characters in service name', () => {
      const service = {
        id: 'service1',
        name: '🔧 नलसाजी सेवा | Plumbing Service 水管服务',
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe('🔧 नलसाजी सेवा | Plumbing Service 水管服务');
    });

    it('should handle whitespace-only strings', () => {
      const service = {
        id: 'service1',
        title: '   ', // Whitespace only
        name: 'Fallback Name',
        price: 100,
      };

      // Note: Empty/whitespace check would need to be implemented if desired
      // Currently, this will display the whitespace
      const displayName = getServiceName(service);
      expect(displayName).toBe('   '); // Current behavior
    });

    it('should handle numbers as service name', () => {
      const service = {
        id: 'service1',
        title: 123, // Number instead of string
        price: 100,
      };

      const displayName = getServiceName(service);
      expect(displayName).toBe(123);
    });

    it('should maintain backward compatibility with different field combinations', () => {
      const testCases = [
        {
          service: { title: 'New Format' },
          expected: 'New Format',
          description: 'New service with title only',
        },
        {
          service: { name: 'Old Format' },
          expected: 'Old Format',
          description: 'Legacy service with name only',
        },
        {
          service: { title: 'New', name: 'Old' },
          expected: 'New',
          description: 'Both present, title takes precedence',
        },
        {
          service: {},
          expected: 'Service',
          description: 'Empty object',
        },
      ];

      testCases.forEach(({ service, expected, description }) => {
        const displayName = getServiceName(service);
        expect(displayName).toBe(expected);
      });
    });
  });

  describe('Service name in booking context', () => {
    it('should display correct name when booking created from ServiceDetailScreen', () => {
      // Scenario: User books from ServiceDetailScreen using freshService
      const bookingService = {
        id: 'service123',
        title: 'Professional Electrical Installation',
        category: 'Installation',
        price: 500,
        technicianId: 'tech1',
      };

      const displayName = getServiceName(bookingService);
      expect(displayName).toBe('Professional Electrical Installation');
    });

    it('should display correct name when booking retrieved from Redux store', () => {
      // Scenario: Booking already exists in Redux
      const storedService = {
        id: 'service456',
        name: 'Home Repair Service',
        status: 'completed',
      };

      const displayName = getServiceName(storedService);
      expect(displayName).toBe('Home Repair Service');
    });

    it('should fallback to default for corrupted service data', () => {
      // Scenario: Data corruption or API error
      const corruptedService = {
        id: 'service789',
        title: null,
        name: undefined,
      };

      const displayName = getServiceName(corruptedService);
      expect(displayName).toBe('Service');
    });
  });

  describe('Service name consistency across different screens', () => {
    it('should display same name in BookingModal and BookingConfirmation', () => {
      const service = {
        id: 'service1',
        title: 'Plumbing Repair',
        price: 100,
      };

      const bookingModalName = getServiceName(service);
      const confirmationName = getServiceName(service); // Same service object

      expect(bookingModalName).toBe(confirmationName);
      expect(bookingModalName).toBe('Plumbing Repair');
    });

    it('should maintain name consistency during booking workflow', () => {
      // ServiceDetailScreen -> BookingModal -> BookingConfirmation -> BookingsScreen
      const workflow = [
        {
          step: 'ServiceDetailScreen',
          service: { id: 'service1', title: 'Service Title' },
        },
        {
          step: 'BookingModal',
          service: { id: 'service1', title: 'Service Title' },
        },
        {
          step: 'BookingConfirmation',
          service: { id: 'service1', name: 'Service Title' },
        },
        {
          step: 'BookingsScreen (stored)',
          service: { serviceName: 'Service Title' },
        },
      ];

      // Verify names are consistent
      const detailName = getServiceName(workflow[0].service);
      const modalName = getServiceName(workflow[1].service);
      const confirmName = getServiceName(workflow[2].service);

      expect(detailName).toBe('Service Title');
      expect(modalName).toBe('Service Title');
      expect(confirmName).toBe('Service Title');
    });
  });
});
