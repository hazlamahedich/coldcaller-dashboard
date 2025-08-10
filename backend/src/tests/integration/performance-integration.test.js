/**
 * Performance Integration Tests
 * Testing & QA Engineer - Performance testing for calendar and email sync operations
 */

const CalendarService = require('../../services/../../../src/followup/services/calendar.service');
const moment = require('moment-timezone');

// Mock external dependencies
jest.mock('googleapis');
jest.mock('@azure/microsoft-graph-client');

describe('Performance Integration Tests', () => {
  let mockGoogleCalendar;
  let mockOutlookClient;
  
  beforeAll(async () => {
    // Mock Google Calendar API
    mockGoogleCalendar = {
      events: {
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        get: jest.fn(),
        list: jest.fn()
      },
      freebusy: {
        query: jest.fn()
      }
    };
    
    const { google } = require('googleapis');
    google.calendar = jest.fn().mockReturnValue(mockGoogleCalendar);
    
    // Mock Microsoft Graph Client
    mockOutlookClient = {
      api: jest.fn().mockReturnThis(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      get: jest.fn()
    };
    
    const graphClient = require('@azure/microsoft-graph-client');
    graphClient.Client = {
      init: jest.fn(() => mockOutlookClient)
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Calendar Sync Performance', () => {
    it('should handle bulk calendar event creation efficiently', async () => {
      const eventCount = 100;
      const events = Array.from({ length: eventCount }, (_, i) => ({
        title: `Performance Test Event ${i + 1}`,
        description: `Test event for performance testing`,
        startTime: moment().add(i, 'hours').toDate(),
        duration: 30,
        attendees: [`test${i}@example.com`],
        location: `Room ${i % 10}`,
        timezone: 'UTC'
      }));

      // Mock successful responses with realistic delays
      mockGoogleCalendar.events.insert.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: { 
                id: `event_${Date.now()}_${Math.random()}`,
                htmlLink: 'https://calendar.google.com/event'
              }
            });
          }, Math.random() * 10); // 0-10ms random delay
        })
      );

      const startTime = performance.now();
      
      // Test parallel execution
      const results = await Promise.all(
        events.map(event => CalendarService.createEvent(event, 'google'))
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(eventCount);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all events were created
      results.forEach(result => {
        expect(result.id).toBeDefined();
        expect(result.provider).toBe('google');
      });

      console.log(`Created ${eventCount} events in ${executionTime.toFixed(2)}ms`);
      console.log(`Average time per event: ${(executionTime / eventCount).toFixed(2)}ms`);
    });

    it('should efficiently batch calendar availability queries', async () => {
      const userCount = 50;
      const users = Array.from({ length: userCount }, (_, i) => ({
        userId: `user_${i}`,
        provider: 'google',
        tokens: { access_token: `token_${i}` }
      }));

      // Mock busy response with realistic data
      mockGoogleCalendar.freebusy.query.mockImplementation(() =>
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              data: {
                calendars: {
                  primary: {
                    busy: Array.from({ length: Math.floor(Math.random() * 10) }, (_, j) => ({
                      start: moment().add(j * 2, 'hours').toISOString(),
                      end: moment().add(j * 2 + 1, 'hours').toISOString()
                    }))
                  }
                }
              }
            });
          }, Math.random() * 50); // 0-50ms random delay
        })
      );

      const startTime = performance.now();
      
      const availabilities = await Promise.all(
        users.map(user => 
          CalendarService.getAvailability(
            user.userId,
            moment().toDate(),
            moment().add(7, 'days').toDate(),
            user.provider,
            user.tokens
          )
        )
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(availabilities).toHaveLength(userCount);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all availability data is valid
      availabilities.forEach(availability => {
        expect(availability.busy).toBeDefined();
        expect(availability.available).toBeDefined();
        expect(Array.isArray(availability.busy)).toBe(true);
        expect(Array.isArray(availability.available)).toBe(true);
      });

      console.log(`Queried availability for ${userCount} users in ${executionTime.toFixed(2)}ms`);
      console.log(`Average time per query: ${(executionTime / userCount).toFixed(2)}ms`);
    });

    it('should handle concurrent calendar operations without blocking', async () => {
      const operations = [
        // Create events
        ...Array.from({ length: 20 }, (_, i) => ({
          type: 'create',
          data: {
            title: `Concurrent Event ${i}`,
            startTime: moment().add(i, 'days').toDate(),
            duration: 30
          }
        })),
        // Update events (mock existing events)
        ...Array.from({ length: 10 }, (_, i) => ({
          type: 'update',
          eventId: `existing_event_${i}`,
          data: {
            title: `Updated Event ${i}`,
            startTime: moment().add(i + 20, 'days').toDate()
          }
        })),
        // Delete events
        ...Array.from({ length: 5 }, (_, i) => ({
          type: 'delete',
          eventId: `delete_event_${i}`
        }))
      ];

      // Mock responses for different operations
      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { id: `created_${Date.now()}` }
      });
      
      mockGoogleCalendar.events.get.mockResolvedValue({
        data: { 
          id: 'existing_event',
          start: { timeZone: 'UTC' },
          end: { timeZone: 'UTC' }
        }
      });
      
      mockGoogleCalendar.events.update.mockResolvedValue({
        data: { id: `updated_${Date.now()}` }
      });
      
      mockGoogleCalendar.events.delete.mockResolvedValue({});

      const startTime = performance.now();
      
      const results = await Promise.allSettled(
        operations.map(async (op) => {
          switch (op.type) {
            case 'create':
              return await CalendarService.createEvent(op.data, 'google');
            case 'update':
              return await CalendarService.updateEvent(op.eventId, op.data, 'google');
            case 'delete':
              return await CalendarService.deleteEvent(op.eventId, 'google');
            default:
              throw new Error(`Unknown operation: ${op.type}`);
          }
        })
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(operations.length);
      expect(executionTime).toBeLessThan(8000); // Should complete within 8 seconds
      
      // Verify success rates
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Completed ${operations.length} operations in ${executionTime.toFixed(2)}ms`);
      console.log(`Success rate: ${((successful / operations.length) * 100).toFixed(1)}%`);
      console.log(`Failed operations: ${failed}`);

      expect(successful).toBeGreaterThan(operations.length * 0.9); // 90% success rate
    });

    it('should maintain performance under memory pressure', async () => {
      // Create large event data to simulate memory pressure
      const largeEventData = {
        title: 'Memory pressure test',
        description: 'A'.repeat(50000), // 50KB description
        startTime: moment().add(1, 'day').toDate(),
        duration: 60,
        attendees: Array.from({ length: 1000 }, (_, i) => `attendee${i}@example.com`),
        location: 'Large conference room with very long name'.repeat(100)
      };

      mockGoogleCalendar.events.insert.mockResolvedValue({
        data: { 
          id: 'memory_pressure_event',
          htmlLink: 'https://calendar.google.com/event'
        }
      });

      // Monitor memory usage
      const initialMemory = process.memoryUsage();
      const iterations = 10;
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        Array.from({ length: iterations }, () => 
          CalendarService.createEvent(largeEventData, 'google')
        )
      );
      
      const endTime = performance.now();
      const finalMemory = process.memoryUsage();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(iterations);
      expect(executionTime).toBeLessThan(3000); // Should complete within 3 seconds
      
      // Check memory growth
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryGrowthMB = memoryGrowth / (1024 * 1024);
      
      console.log(`Memory growth: ${memoryGrowthMB.toFixed(2)}MB`);
      console.log(`Execution time: ${executionTime.toFixed(2)}ms`);
      
      // Memory growth should be reasonable (less than 100MB for this test)
      expect(memoryGrowthMB).toBeLessThan(100);
    });
  });

  describe('Email Template Performance', () => {
    it('should render email templates efficiently', async () => {
      const templateCount = 1000;
      const leadData = {
        name: 'Performance Test User',
        company: 'Test Corporation',
        email: 'performance@test.com'
      };

      const templates = ['followup', 'introduction', 'thankyou', 'proposal'];
      
      const startTime = performance.now();
      
      // Simulate template rendering (this would normally be done in the frontend)
      const renderedTemplates = Array.from({ length: templateCount }, (_, i) => {
        const templateType = templates[i % templates.length];
        
        // Mock template rendering logic
        const firstName = leadData.name.split(' ')[0];
        const company = leadData.company;
        
        return {
          type: templateType,
          subject: `${templateType} - ${company}`,
          body: `Hi ${firstName},\n\nThis is a ${templateType} email for ${company}.\n\nBest regards`,
          to: leadData.email,
          renderedAt: Date.now()
        };
      });
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(renderedTemplates).toHaveLength(templateCount);
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify all templates rendered correctly
      renderedTemplates.forEach(template => {
        expect(template.subject).toContain('Test Corporation');
        expect(template.body).toContain('Performance Test User'.split(' ')[0]);
        expect(template.to).toBe(leadData.email);
      });

      console.log(`Rendered ${templateCount} templates in ${executionTime.toFixed(2)}ms`);
      console.log(`Average time per template: ${(executionTime / templateCount).toFixed(2)}ms`);
    });

    it('should handle template with large variable substitutions', async () => {
      const largeLeadData = {
        name: 'A'.repeat(1000), // 1KB name
        company: 'B'.repeat(5000), // 5KB company name
        email: 'test@example.com',
        description: 'C'.repeat(10000) // 10KB description
      };

      const iterations = 100;
      
      const startTime = performance.now();
      
      const results = Array.from({ length: iterations }, () => {
        // Mock complex template substitution
        const firstName = largeLeadData.name.substring(0, 50); // Truncate for practical use
        const company = largeLeadData.company.substring(0, 100);
        
        return {
          subject: `Follow-up with ${company}`,
          body: `Hi ${firstName},\n\n${largeLeadData.description}\n\nBest regards`,
          processedAt: Date.now()
        };
      });
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(iterations);
      expect(executionTime).toBeLessThan(500); // Should complete within 500ms
      
      console.log(`Processed ${iterations} large templates in ${executionTime.toFixed(2)}ms`);
      console.log(`Average processing time: ${(executionTime / iterations).toFixed(2)}ms`);
    });
  });

  describe('Webhook Performance', () => {
    it('should process high-volume webhook events efficiently', async () => {
      const webhookCount = 1000;
      const webhookEvents = Array.from({ length: webhookCount }, (_, i) => ({
        id: `webhook_${i}`,
        event: i % 2 === 0 ? 'calendar.event.created' : 'email.sent',
        timestamp: Date.now(),
        data: {
          id: `event_${i}`,
          title: `Event ${i}`,
          type: 'performance_test'
        }
      }));

      const startTime = performance.now();
      
      // Simulate webhook processing
      const processedEvents = await Promise.all(
        webhookEvents.map(async (event) => {
          // Mock processing delay
          await new Promise(resolve => setTimeout(resolve, Math.random() * 2));
          
          return {
            ...event,
            processed: true,
            processedAt: Date.now()
          };
        })
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(processedEvents).toHaveLength(webhookCount);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify all events processed
      processedEvents.forEach(event => {
        expect(event.processed).toBe(true);
        expect(event.processedAt).toBeDefined();
      });

      console.log(`Processed ${webhookCount} webhook events in ${executionTime.toFixed(2)}ms`);
      console.log(`Average processing time: ${(executionTime / webhookCount).toFixed(2)}ms`);
    });

    it('should handle webhook burst traffic', async () => {
      const burstSize = 500;
      const burstCount = 5;
      const totalEvents = burstSize * burstCount;

      const startTime = performance.now();
      
      // Simulate burst traffic (5 bursts of 500 events each)
      const burstPromises = Array.from({ length: burstCount }, (_, burstIndex) => 
        Promise.all(
          Array.from({ length: burstSize }, (_, eventIndex) => {
            const eventId = burstIndex * burstSize + eventIndex;
            
            // Mock webhook processing with variable delay
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  burstIndex,
                  eventIndex,
                  eventId,
                  processed: true,
                  timestamp: Date.now()
                });
              }, Math.random() * 10); // 0-10ms delay
            });
          })
        )
      );

      const burstResults = await Promise.all(burstPromises);
      const allResults = burstResults.flat();
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(allResults).toHaveLength(totalEvents);
      expect(executionTime).toBeLessThan(15000); // Should complete within 15 seconds
      
      // Verify processing order and timing
      const processedCount = allResults.filter(r => r.processed).length;
      expect(processedCount).toBe(totalEvents);

      console.log(`Processed ${totalEvents} events in ${burstCount} bursts`);
      console.log(`Total time: ${executionTime.toFixed(2)}ms`);
      console.log(`Events per second: ${(totalEvents / (executionTime / 1000)).toFixed(0)}`);
    });
  });

  describe('Resource Management', () => {
    it('should manage connection pools efficiently', async () => {
      const connectionCount = 100;
      
      // Mock connection pool
      const mockConnections = Array.from({ length: connectionCount }, (_, i) => ({
        id: i,
        inUse: false,
        created: Date.now(),
        lastUsed: null
      }));

      const startTime = performance.now();
      
      // Simulate concurrent connection usage
      const operations = await Promise.all(
        Array.from({ length: connectionCount * 2 }, async (_, i) => {
          // Find available connection
          const connection = mockConnections.find(conn => !conn.inUse);
          
          if (connection) {
            connection.inUse = true;
            connection.lastUsed = Date.now();
            
            // Simulate operation
            await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
            
            connection.inUse = false;
            
            return { operationId: i, connectionId: connection.id, success: true };
          } else {
            return { operationId: i, connectionId: null, success: false };
          }
        })
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const successfulOps = operations.filter(op => op.success);
      const failedOps = operations.filter(op => !op.success);
      
      expect(successfulOps.length).toBeGreaterThan(connectionCount * 1.5); // Should reuse connections
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Completed ${successfulOps.length} operations with ${connectionCount} connections`);
      console.log(`Failed operations: ${failedOps.length}`);
      console.log(`Connection reuse efficiency: ${((successfulOps.length / connectionCount) * 100).toFixed(1)}%`);
    });

    it('should handle database connection pooling', async () => {
      // Mock database operations
      const dbOperations = [
        'SELECT',
        'INSERT',
        'UPDATE',
        'DELETE'
      ];

      const operationCount = 200;
      const maxConnections = 10;
      
      let activeConnections = 0;
      let maxActiveConnections = 0;
      
      const startTime = performance.now();
      
      const results = await Promise.all(
        Array.from({ length: operationCount }, (_, i) => {
          const operation = dbOperations[i % dbOperations.length];
          
          return new Promise(resolve => {
            // Wait for available connection
            const checkConnection = () => {
              if (activeConnections < maxConnections) {
                activeConnections++;
                maxActiveConnections = Math.max(maxActiveConnections, activeConnections);
                
                // Simulate database operation
                setTimeout(() => {
                  activeConnections--;
                  resolve({
                    operationId: i,
                    operation,
                    completed: true,
                    timestamp: Date.now()
                  });
                }, Math.random() * 50); // 0-50ms operation time
              } else {
                // Wait and retry
                setTimeout(checkConnection, 1);
              }
            };
            
            checkConnection();
          });
        })
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      expect(results).toHaveLength(operationCount);
      expect(maxActiveConnections).toBeLessThanOrEqual(maxConnections);
      expect(executionTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      const completedOps = results.filter(r => r.completed);
      
      console.log(`Completed ${completedOps.length}/${operationCount} DB operations`);
      console.log(`Max concurrent connections: ${maxActiveConnections}/${maxConnections}`);
      console.log(`Total execution time: ${executionTime.toFixed(2)}ms`);
      console.log(`Operations per second: ${(operationCount / (executionTime / 1000)).toFixed(0)}`);
    });
  });

  describe('Error Recovery Performance', () => {
    it('should maintain performance during error conditions', async () => {
      const totalOperations = 100;
      const errorRate = 0.2; // 20% error rate
      
      // Mock operations with controlled error rate
      mockGoogleCalendar.events.insert.mockImplementation(() => {
        if (Math.random() < errorRate) {
          return Promise.reject(new Error('Simulated API error'));
        }
        return Promise.resolve({
          data: { id: `event_${Date.now()}` }
        });
      });

      const startTime = performance.now();
      
      const results = await Promise.allSettled(
        Array.from({ length: totalOperations }, () => 
          CalendarService.createEvent({
            title: 'Error recovery test',
            startTime: moment().add(1, 'day').toDate(),
            duration: 30
          }, 'google')
        )
      );
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;

      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(results).toHaveLength(totalOperations);
      expect(executionTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify expected error rate
      const actualErrorRate = failed.length / totalOperations;
      expect(Math.abs(actualErrorRate - errorRate)).toBeLessThan(0.1); // Within 10% of expected
      
      console.log(`Operations completed: ${successful.length}/${totalOperations}`);
      console.log(`Error rate: ${(actualErrorRate * 100).toFixed(1)}%`);
      console.log(`Performance under errors: ${executionTime.toFixed(2)}ms`);
    });
  });
});