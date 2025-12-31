import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuthManager } from '../app/services/auth_manager';
import { AuthProvider } from '../app/types/auth';
import { HttpContext } from '@adonisjs/core/http';
import User from '../app/models/user';

// Mock HeaderAuthProvider
class MockHeaderProvider implements AuthProvider {
  name = 'header';
  enabled = vi.fn();
  canHandle = vi.fn();
  authenticate = vi.fn();
}

describe('AuthManager', () => {
  let authManager: AuthManager;
  let mockProvider: MockHeaderProvider;

  beforeEach(() => {
    authManager = new AuthManager();
    mockProvider = new MockHeaderProvider();
  });

  it('should register providers on initialization', () => {
    const providers = authManager.getProviders();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.some((p) => p.name === 'header')).toBe(true);
  });

  it('should add custom provider', () => {
    const customProvider = {
      name: 'custom',
      enabled: () => true,
      canHandle: () => true,
      authenticate: vi.fn(),
    };
    authManager.addProvider(customProvider);
    const providers = authManager.getProviders();
    expect(providers).toContainEqual(customProvider);
  });

  it('should skip disabled providers', async () => {
    // Create mock context
    const ctx = {
      request: { header: vi.fn(), ip: '127.0.0.1' },
      response: {},
    } as unknown as HttpContext;

    // Mock provider that is disabled
    mockProvider.enabled.mockReturnValue(false);
    mockProvider.canHandle.mockReturnValue(true);
    mockProvider.authenticate.mockResolvedValue(null);

    authManager.addProvider(mockProvider);
    const result = await authManager.authenticate(ctx);

    expect(mockProvider.enabled).toHaveBeenCalled();
    expect(mockProvider.authenticate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should skip providers that cannot handle request', async () => {
    const ctx = {
      request: { header: vi.fn(), ip: '127.0.0.1' },
      response: {},
    } as unknown as HttpContext;

    mockProvider.enabled.mockReturnValue(true);
    mockProvider.canHandle.mockReturnValue(false);
    mockProvider.authenticate.mockResolvedValue(null);

    authManager.addProvider(mockProvider);
    const result = await authManager.authenticate(ctx);

    expect(mockProvider.canHandle).toHaveBeenCalled();
    expect(mockProvider.authenticate).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });

  it('should return first successful authentication', async () => {
    const ctx = {
      request: { header: vi.fn(), ip: '127.0.0.1' },
      response: {},
    } as unknown as HttpContext;

    const mockUser = { id: 1, username: 'test' };

    // First provider fails
    const provider1 = new MockHeaderProvider();
    provider1.name = 'provider1';
    provider1.enabled.mockReturnValue(true);
    provider1.canHandle.mockReturnValue(true);
    provider1.authenticate.mockResolvedValue(null);

    // Second provider succeeds
    const provider2 = new MockHeaderProvider();
    provider2.name = 'provider2';
    provider2.enabled.mockReturnValue(true);
    provider2.canHandle.mockReturnValue(true);
    provider2.authenticate.mockResolvedValue(mockUser as unknown as User);

    authManager.addProvider(provider1);
    authManager.addProvider(provider2);

    const result = await authManager.authenticate(ctx);

    expect(provider1.authenticate).toHaveBeenCalled();
    expect(provider2.authenticate).toHaveBeenCalled();
    expect(result).toBe(mockUser);
  });

  it('should return null if all providers fail', async () => {
    const ctx = {
      request: { header: vi.fn(), ip: '127.0.0.1' },
      response: {},
    } as unknown as HttpContext;

    mockProvider.enabled.mockReturnValue(true);
    mockProvider.canHandle.mockReturnValue(true);
    mockProvider.authenticate.mockResolvedValue(null);

    authManager.addProvider(mockProvider);
    const result = await authManager.authenticate(ctx);

    expect(result).toBeNull();
  });

  it('should handle provider errors gracefully', async () => {
    const ctx = {
      request: { header: vi.fn(), ip: '127.0.0.1' },
      response: {},
    } as unknown as HttpContext;

    const provider1 = new MockHeaderProvider();
    provider1.name = 'provider1';
    provider1.enabled.mockReturnValue(true);
    provider1.canHandle.mockReturnValue(true);
    provider1.authenticate.mockRejectedValue(new Error('Provider error'));

    const provider2 = new MockHeaderProvider();
    provider2.name = 'provider2';
    provider2.enabled.mockReturnValue(true);
    provider2.canHandle.mockReturnValue(true);
    provider2.authenticate.mockResolvedValue({ id: 1 } as unknown as User);

    authManager.addProvider(provider1);
    authManager.addProvider(provider2);

    const result = await authManager.authenticate(ctx);

    expect(provider1.authenticate).toHaveBeenCalled();
    expect(provider2.authenticate).toHaveBeenCalled();
    expect(result).toEqual({ id: 1 });
  });
});
