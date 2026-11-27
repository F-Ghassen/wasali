import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callsFor, queueResult, reset } from './support/fakeSupabase';

vi.mock('@/lib/supabase', async () => {
  const { fakeClient } = await import('./support/fakeSupabase');
  return { supabase: fakeClient };
});

import {
  createAddress,
  deleteAddress,
  fetchSavedAddresses,
  setDefaultAddress,
  updateAddress,
  upsertContactAddress,
} from '@/services/addressService';

const USER = 'user-1';
const RECORD = { label: 'Home', street: '1 Main', city: 'Paris', country: 'France', postal_code: '75001' };

beforeEach(() => reset());

describe('fetchSavedAddresses', () => {
  it('drops addresses linked to a contact and strips the join key', async () => {
    queueResult('addresses', {
      data: [
        { id: 'a1', label: 'Home', contacts: [] },
        { id: 'a2', label: 'Sami', contacts: [{ id: 'c1' }] },
      ],
    });

    const result = await fetchSavedAddresses(USER);

    expect(result).toEqual([{ id: 'a1', label: 'Home' }]);
    expect(result[0]).not.toHaveProperty('contacts');
  });

  it('returns an empty list when there is no data', async () => {
    queueResult('addresses', { data: null });

    await expect(fetchSavedAddresses(USER)).resolves.toEqual([]);
  });

  it('throws on query error', async () => {
    queueResult('addresses', { error: new Error('rls') });

    await expect(fetchSavedAddresses(USER)).rejects.toThrow('rls');
  });
});

describe('createAddress', () => {
  it('inserts for the user as a non-default address', async () => {
    await createAddress(USER, RECORD);

    const insert = callsFor('addresses').find((c) => c.op === 'insert');
    expect(insert?.args[0]).toEqual({ ...RECORD, user_id: USER, is_default: false });
  });
});

describe('updateAddress', () => {
  it('updates the row by id', async () => {
    await updateAddress('a1', RECORD);

    expect(callsFor('addresses').find((c) => c.op === 'update')?.args[0]).toEqual(RECORD);
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['id', 'a1']);
  });

  it('throws on error', async () => {
    queueResult('addresses', { error: new Error('denied') });

    await expect(updateAddress('a1', RECORD)).rejects.toThrow('denied');
  });
});

describe('deleteAddress', () => {
  it('deletes the row by id', async () => {
    await deleteAddress('a1');

    expect(callsFor('addresses').some((c) => c.op === 'delete')).toBe(true);
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['id', 'a1']);
  });
});

describe('setDefaultAddress', () => {
  it('calls the set_default_address RPC with the address id', async () => {
    await setDefaultAddress('a1');

    expect(callsFor('rpc:set_default_address')[0]?.args).toEqual([{ p_address_id: 'a1' }]);
  });

  it('throws when the RPC fails', async () => {
    queueResult('rpc:set_default_address', { error: new Error('Address not found') });

    await expect(setDefaultAddress('missing')).rejects.toThrow('Address not found');
  });
});

describe('upsertContactAddress', () => {
  const ADDRESS = { street: '5 Rue', city: 'Sfax', postal_code: null };

  it('inserts a Tunisian address when the contact has none yet', async () => {
    queueResult('addresses', { data: { id: 'new-id' } });

    await expect(upsertContactAddress(USER, 'Sami', ADDRESS, null)).resolves.toBe('new-id');

    expect(callsFor('addresses').find((c) => c.op === 'insert')?.args[0]).toMatchObject({
      user_id: USER,
      label: 'Sami',
      country: 'Tunisia',
    });
  });

  it('updates the existing row and returns its id', async () => {
    await expect(upsertContactAddress(USER, 'Sami', ADDRESS, 'existing-id')).resolves.toBe('existing-id');

    expect(callsFor('addresses').some((c) => c.op === 'insert')).toBe(false);
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['id', 'existing-id']);
  });
});
