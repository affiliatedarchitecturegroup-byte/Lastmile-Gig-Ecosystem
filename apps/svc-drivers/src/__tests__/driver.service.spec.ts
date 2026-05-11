/**
 * Driver Service Unit Tests
 *
 * Tests registration, profile management, status transitions, and availability.
 * Coverage target: 80%+ per DEVELOPMENT_DIRECTIVES.md Section 4.1.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { DriverService } from '../driver.service';
import { DriverRepository } from '../repositories/driver.repository';
import { KafkaProducerService } from '../services/kafka-producer.service';

describe('DriverService', () => {
  let service: DriverService;
  let driverRepo: DriverRepository;
  let kafkaProducer: KafkaProducerService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      environment: 'development',
      port: 3002,
      supabase: { url: '', anonKey: '', serviceRoleKey: '' },
      mongodb: { uri: '', database: '' },
      redis: { url: '', token: '', keyPrefix: '' },
      kafka: { brokers: ['localhost:9092'], clientId: '', groupId: '' },
      paystack: { secretKey: '', publicKey: '', baseUrl: '' },
      rekognition: { region: '', collectionId: '', minSimilarity: 95, livenessThreshold: 0.95 },
      vault: { url: '', biometricPath: '' },
      sagemaker: { driverScoreEndpoint: '', region: '' },
    }),
  };

  const mockDriverRepo = {
    create: jest.fn().mockResolvedValue({
      id: 'driver-uuid-123',
      user_id: 'user-uuid-123',
      email: 'driver@test.com',
      phone: '+27823456789',
      full_name: 'Test Driver',
      vehicle_type: 'scooter',
      zone: 'KZN-North',
      status: 'onboarding',
    }),
    findById: jest.fn().mockResolvedValue({
      id: 'driver-uuid-123',
      user_id: 'user-uuid-123',
      email: 'driver@test.com',
      full_name: 'Test Driver',
      vehicle_type: 'scooter',
      zone: 'KZN-North',
      status: 'active',
      performance_score: 85,
    }),
    findByUserId: jest.fn().mockResolvedValue(null),
    findByEmail: jest.fn().mockResolvedValue(null),
    update: jest.fn().mockImplementation((_id: string, updates: Record<string, unknown>) => Promise.resolve({ ...updates })),
    updateStatus: jest.fn().mockResolvedValue({ status: 'idle' }),
    findAvailable: jest.fn().mockResolvedValue([]),
    findAll: jest.fn().mockResolvedValue({ drivers: [], total: 0 }),
    countByZone: jest.fn().mockResolvedValue({ 'KZN-North': 5, 'KZN-South': 3 }),
    toProfile: jest.fn().mockImplementation((driver: Record<string, unknown>) => ({
      id: driver['id'],
      email: driver['email'],
      fullName: driver['full_name'],
      vehicleType: driver['vehicle_type'],
      zone: driver['zone'],
      status: driver['status'],
      performanceScore: driver['performance_score'],
    })),
  };

  const mockKafkaProducer = {
    publishDriverRegistered: jest.fn().mockResolvedValue(undefined),
    publishDriverStatusChanged: jest.fn().mockResolvedValue(undefined),
    publishDriverLocationUpdated: jest.fn().mockResolvedValue(undefined),
    publishDriverOnboarded: jest.fn().mockResolvedValue(undefined),
    publishDriverSuspended: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: DriverRepository, useValue: mockDriverRepo },
        { provide: KafkaProducerService, useValue: mockKafkaProducer },
      ],
    }).compile();

    service = module.get<DriverService>(DriverService);
    driverRepo = module.get<DriverRepository>(DriverRepository);
    kafkaProducer = module.get<KafkaProducerService>(KafkaProducerService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    const dto = {
      email: 'driver@test.com',
      phone: '+27823456789',
      fullName: 'Test Driver',
      idNumber: '9501015800089',
      vehicleType: 'scooter' as const,
      zone: 'KZN-North' as const,
      popiaConsent: true,
    };

    it('should register a new driver successfully', async () => {
      const result = await service.register(dto, 'user-uuid-123');

      expect(result.driverId).toBe('driver-uuid-123');
      expect(result.status).toBe('onboarding');
      expect(result.nextSteps).toHaveLength(4);
      expect(driverRepo.create).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.publishDriverRegistered).toHaveBeenCalledTimes(1);
    });

    it('should reject registration without POPIA consent', async () => {
      await expect(
        service.register({ ...dto, popiaConsent: false }, 'user-uuid-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate registration', async () => {
      mockDriverRepo.findByUserId.mockResolvedValueOnce({ id: 'existing' });

      await expect(
        service.register(dto, 'user-uuid-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update status and publish Kafka event', async () => {
      const result = await service.updateStatus(
        'driver-uuid-123',
        { status: 'idle' as const },
        'admin-user',
        'admin',
      );

      expect(driverRepo.updateStatus).toHaveBeenCalledTimes(1);
      expect(kafkaProducer.publishDriverStatusChanged).toHaveBeenCalledTimes(1);
    });

    it('should reject non-admin reactivation of suspended driver', async () => {
      mockDriverRepo.findById.mockResolvedValueOnce({ status: 'suspended' });

      await expect(
        service.updateStatus('driver-uuid-123', { status: 'active' as const }, 'driver-user', 'driver'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject onboarding->active without admin role', async () => {
      mockDriverRepo.findById.mockResolvedValueOnce({ status: 'onboarding' });

      await expect(
        service.updateStatus('driver-uuid-123', { status: 'active' as const }, 'driver-user', 'driver'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getAvailableDrivers', () => {
    it('should query available drivers by zone', async () => {
      mockDriverRepo.findAvailable.mockResolvedValueOnce([
        { id: 'd1', zone: 'KZN-North', status: 'active', performance_score: 90 },
      ]);

      const result = await service.getAvailableDrivers('KZN-North');

      expect(result.zone).toBe('KZN-North');
      expect(driverRepo.findAvailable).toHaveBeenCalledWith('KZN-North', undefined, undefined, 20);
    });
  });

  describe('getZoneStats', () => {
    it('should return driver counts per zone', async () => {
      const stats = await service.getZoneStats();

      expect(stats['KZN-North']).toBe(5);
      expect(stats['KZN-South']).toBe(3);
    });
  });
});
