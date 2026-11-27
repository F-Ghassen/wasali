import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callsFor, queueResult, reset } from './support/fakeSupabase';

vi.mock('@/lib/supabase', async () => {
  const { fakeClient } = await import('./support/fakeSupabase');
  return { supabase: fakeClient };
});

import {
  createAddress,
  createPersonAddress,
  deleteAddress,
  fetchSavedAddresses,
  setDefaultAddress,
  setDefaultPersonAddress,
  updateAddress,
} from '@/services/addressService';

const USER = 'user-1';
const RECORD = { label: 'Home', street: '1 Main', city: 'Paris', country: 'France', postal_code: '75001' };

beforeEach(() => reset());

describe('fetchSavedAddresses', () => {
  it('reads the places only, filtering out person addresses in the query', async () => {
    queueResult('addresses', { data: [{ id: 'a1', label: 'Home', contact_id: null }] });

    await expect(fetchSavedAddresses(USER)).resolves.toEqual([{ id: 'a1', label: 'Home', contact_id: null }]);
    expect(callsFor('addresses').find((c) => c.op === 'is')?.args).toEqual(['contact_id', null]);
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['user_id', USER]);
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
  it('inserts a place for the user as non-default, with no person', async () => {
    await createAddress(USER, RECORD);

    expect(callsFor('addresses').find((c) => c.op === 'insert')?.args[0]).toEqual({
      ...RECORD,
      user_id: USER,
      contact_id: null,
      is_default: false,
    });
  });
});

describe('createPersonAddress', () => {
  it('inserts an address linked to the person', async () => {
    await createPersonAddress(USER, 'c1', RECORD, false);

    expect(callsFor('addresses').find((c) => c.op === 'insert')?.args[0]).toEqual({
      ...RECORD,
      user_id: USER,
      contact_id: 'c1',
      is_default: false,
    });
  });

  it('inserts as the default when asked', async () => {
    await createPersonAddress(USER, 'c1', RECORD, true);

    expect(callsFor('addresses').find((c) => c.op === 'insert')?.args[0]).toMatchObject({ is_default: true });
  });

  it('throws on error', async () => {
    queueResult('addresses', { error: new Error('denied') });

    await expect(createPersonAddress(USER, 'c1', RECORD, false)).rejects.toThrow('denied');
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

describe('setDefaultPersonAddress', () => {
  it('calls the set_default_person_address RPC with the address id', async () => {
    await setDefaultPersonAddress('a2');

    expect(callsFor('rpc:set_default_person_address')[0]?.args).toEqual([{ p_address_id: 'a2' }]);
  });

  it('throws when the RPC fails', async () => {
    queueResult('rpc:set_default_person_address', { error: new Error('Address not found') });

    await expect(setDefaultPersonAddress('missing')).rejects.toThrow('Address not found');
  });
});
