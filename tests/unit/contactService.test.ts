import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calls, callsFor, queueResult, reset } from './support/fakeSupabase';

vi.mock('@/lib/supabase', async () => {
  const { fakeClient } = await import('./support/fakeSupabase');
  return { supabase: fakeClient };
});

import { deleteContact, fetchContacts, saveContact, updateContact } from '@/services/contactService';

const USER = 'user-1';
const ADDRESS = { street: '12 Rue X', city: 'Tunis', postal_code: '1000' };
const PERSON = { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: true };
const EXISTING = { id: 'addr-1', street: '12 Rue X', city: 'Tunis', is_default: true };

beforeEach(() => reset());

describe('saveContact', () => {
  it('upserts the person by (user_id, phone) without writing addresses when there is no booking address', async () => {
    queueResult('contacts', { data: { id: 'c1', addresses: [] } });

    await saveContact(USER, { ...PERSON, address: null });

    const upsert = callsFor('contacts').find((c) => c.op === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      user_id: USER,
      name: 'Sami',
      phone: '+21620',
      phone_country_code: '+216',
      phone_number: '20',
      whatsapp_enabled: true,
    });
    expect(upsert?.args[0]).not.toHaveProperty('address_id');
    expect(upsert?.args[1]).toEqual({ onConflict: 'user_id,phone' });
    expect(callsFor('addresses')).toHaveLength(0);
  });

  it('adds the booking address as the default when the person has no address yet', async () => {
    queueResult('contacts', { data: { id: 'c1', addresses: [] } });

    await saveContact(USER, { ...PERSON, address: ADDRESS });

    const insert = callsFor('addresses').find((c) => c.op === 'insert');
    expect(insert?.args[0]).toEqual({
      user_id: USER,
      contact_id: 'c1',
      label: '',
      street: '12 Rue X',
      city: 'Tunis',
      country: 'Tunisia',
      postal_code: '1000',
      is_default: true,
    });
  });

  it('adds a new booking address as non-default when the person already has one', async () => {
    queueResult('contacts', { data: { id: 'c1', addresses: [EXISTING] } });

    await saveContact(USER, { ...PERSON, address: { ...ADDRESS, street: '9 Av Habib' } });

    expect(callsFor('addresses').find((c) => c.op === 'insert')?.args[0]).toMatchObject({
      contact_id: 'c1',
      street: '9 Av Habib',
      is_default: false,
    });
  });

  it('does not add a booking address the person already has', async () => {
    queueResult('contacts', { data: { id: 'c1', addresses: [EXISTING] } });

    await saveContact(USER, { ...PERSON, address: { ...ADDRESS, street: ' 12 RUE x ' } });

    expect(callsFor('addresses').some((c) => c.op === 'insert')).toBe(false);
  });

  it('throws when the contact write fails', async () => {
    queueResult('contacts', { error: new Error('unique violation') });

    await expect(saveContact(USER, { ...PERSON, address: null })).rejects.toThrow('unique violation');
  });
});

describe('updateContact', () => {
  it('writes only person fields, by id', async () => {
    await updateContact('c1', { ...PERSON, name: 'Sami B', address: null });

    const update = callsFor('contacts').find((c) => c.op === 'update');
    expect(update?.args[0]).toMatchObject({ name: 'Sami B', phone: '+21620', whatsapp_enabled: true });
    expect(update?.args[0]).not.toHaveProperty('address_id');
    expect(callsFor('contacts').find((c) => c.op === 'eq')?.args).toEqual(['id', 'c1']);
    expect(callsFor('addresses')).toHaveLength(0);
  });

  it('throws when the write fails', async () => {
    queueResult('contacts', { error: new Error('unique violation') });

    await expect(updateContact('c1', { ...PERSON, address: null })).rejects.toThrow('unique violation');
  });
});

describe('deleteContact', () => {
  it('deletes only the person; their addresses cascade in the database', async () => {
    await deleteContact('c1');

    expect(callsFor('contacts').some((c) => c.op === 'delete')).toBe(true);
    expect(callsFor('contacts').find((c) => c.op === 'eq')?.args).toEqual(['id', 'c1']);
    expect(calls.some((c) => c.table === 'addresses')).toBe(false);
  });
});

describe('fetchContacts', () => {
  it('normalises a to-one addresses embed (pre-062 schema) into a list', async () => {
    queueResult('contacts', {
      data: [{ id: 'c1', name: 'Sami', phone: '+21620', whatsapp_enabled: false, addresses: EXISTING }],
    });

    const [row] = await fetchContacts(USER);

    expect(row.addresses).toEqual([EXISTING]);
  });

  it('gives an empty list when the person has no address', async () => {
    queueResult('contacts', {
      data: [{ id: 'c1', name: 'Sami', phone: '+21620', whatsapp_enabled: false, addresses: null }],
    });

    const [row] = await fetchContacts(USER);

    expect(row.addresses).toEqual([]);
  });

  it('fetches one page by row range, newest first', async () => {
    queueResult('contacts', { data: [] });

    await fetchContacts(USER, 20, 39);

    expect(callsFor('contacts').find((c) => c.op === 'range')?.args).toEqual([20, 39]);
    expect(callsFor('contacts').find((c) => c.op === 'order')?.args).toEqual(['created_at', { ascending: false }]);
  });

  it('returns the rows scoped to the user, with their addresses embedded', async () => {
    const rows = [{ id: 'c1', name: 'Sami', phone: '+21620', whatsapp_enabled: false, addresses: [EXISTING] }];
    queueResult('contacts', { data: rows });

    await expect(fetchContacts(USER)).resolves.toEqual(rows);
    expect(callsFor('contacts').find((c) => c.op === 'eq')?.args).toEqual(['user_id', USER]);
    expect(callsFor('contacts').find((c) => c.op === 'select')?.args[0]).toContain('addresses(');
  });

  it('throws on query error', async () => {
    queueResult('contacts', { error: new Error('boom') });

    await expect(fetchContacts(USER)).rejects.toThrow('boom');
  });
});
