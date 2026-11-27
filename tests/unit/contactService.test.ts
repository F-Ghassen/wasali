import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calls, callsFor, queueResult, reset } from './support/fakeSupabase';

vi.mock('@/lib/supabase', async () => {
  const { fakeClient } = await import('./support/fakeSupabase');
  return { supabase: fakeClient };
});

import {
  deleteContact,
  fetchContacts,
  saveContact,
  updateContact,
} from '@/services/contactService';

const USER = 'user-1';
const ADDRESS = { street: '12 Rue X', city: 'Tunis', postal_code: '1000' };

beforeEach(() => reset());

describe('saveContact', () => {
  it('inserts an address and upserts the contact by (user_id, phone) when the phone is new', async () => {
    queueResult('contacts', { data: null }); // lookup by phone: none
    queueResult('addresses', { data: { id: 'addr-new' } }); // insert address

    await saveContact(USER, { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: true, address: ADDRESS });

    const insert = callsFor('addresses').find((c) => c.op === 'insert');
    expect(insert?.args[0]).toMatchObject({
      user_id: USER,
      label: 'Sami',
      country: 'Tunisia',
      is_default: false,
    });

    const upsert = callsFor('contacts').find((c) => c.op === 'upsert');
    expect(upsert?.args[0]).toMatchObject({
      user_id: USER,
      phone: '+21620',
      phone_country_code: '+216',
      phone_number: '20',
      address_id: 'addr-new',
    });
    expect(upsert?.args[1]).toEqual({ onConflict: 'user_id,phone' });
  });

  it('updates the existing address in place instead of inserting another', async () => {
    queueResult('contacts', { data: { id: 'c1', address_id: 'addr-old' } });

    await saveContact(USER, { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: false, address: ADDRESS });

    expect(callsFor('addresses').some((c) => c.op === 'insert')).toBe(false);
    expect(callsFor('addresses').some((c) => c.op === 'update')).toBe(true);
    expect(callsFor('addresses').some((c) => c.op === 'delete')).toBe(false);
  });

  it('deletes the orphaned address when the address was cleared', async () => {
    queueResult('contacts', { data: { id: 'c1', address_id: 'addr-old' } });

    await saveContact(USER, { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: false, address: null });

    const deleteCall = callsFor('addresses').find((c) => c.op === 'delete');
    expect(deleteCall).toBeDefined();
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['id', 'addr-old']);
  });

  it('removes the old address only after the contact stopped pointing at it', async () => {
    queueResult('contacts', { data: { id: 'c1', address_id: 'addr-old' } });

    await saveContact(USER, { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: false, address: null });

    const contactWrite = calls.findIndex((c) => c.table === 'contacts' && (c.op === 'upsert' || c.op === 'update'));
    const addressDelete = calls.findIndex((c) => c.table === 'addresses' && c.op === 'delete');
    expect(contactWrite).toBeGreaterThan(-1);
    expect(addressDelete).toBeGreaterThan(contactWrite);
  });

  it('throws when the contact write fails', async () => {
    queueResult('contacts', { data: null });
    queueResult('contacts', { error: new Error('unique violation') });

    await expect(
      saveContact(USER, { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: false, address: null }),
    ).rejects.toThrow('unique violation');
  });
});

describe('updateContact', () => {
  it('writes by id and inserts a new address when the contact had none', async () => {
    queueResult('contacts', { data: { address_id: null } }); // read current
    queueResult('addresses', { data: { id: 'addr-new' } });

    await updateContact(USER, 'c1', { name: 'Sami B', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: true, address: ADDRESS });

    const update = callsFor('contacts').find((c) => c.op === 'update');
    expect(update?.args[0]).toMatchObject({ name: 'Sami B', address_id: 'addr-new' });
    expect(callsFor('contacts').find((c) => c.op === 'eq')?.args).toEqual(['id', 'c1']);
  });

  it('removes the address when the edit clears it', async () => {
    queueResult('contacts', { data: { address_id: 'addr-old' } });

    await updateContact(USER, 'c1', { name: 'Sami', phoneCountryCode: '+216', phoneNumber: '20', whatsappEnabled: false, address: null });

    expect(callsFor('addresses').some((c) => c.op === 'delete')).toBe(true);
  });
});

describe('deleteContact', () => {
  it('deletes the contact and then its address', async () => {
    queueResult('contacts', { data: { address_id: 'addr-9' } });

    await deleteContact('c1');

    expect(callsFor('contacts').some((c) => c.op === 'delete')).toBe(true);
    expect(callsFor('addresses').find((c) => c.op === 'eq')?.args).toEqual(['id', 'addr-9']);
  });

  it('leaves the address book alone when the contact had no address', async () => {
    queueResult('contacts', { data: { address_id: null } });

    await deleteContact('c1');

    expect(callsFor('addresses')).toHaveLength(0);
  });
});

describe('fetchContacts', () => {
  it('returns the rows scoped to the user', async () => {
    const rows = [{ id: 'c1', name: 'Sami', phone: '+21620', whatsapp_enabled: false, address: null }];
    queueResult('contacts', { data: rows });

    await expect(fetchContacts(USER)).resolves.toEqual(rows);
    expect(callsFor('contacts').find((c) => c.op === 'eq')?.args).toEqual(['user_id', USER]);
  });

  it('throws on query error', async () => {
    queueResult('contacts', { error: new Error('boom') });

    await expect(fetchContacts(USER)).rejects.toThrow('boom');
  });
});
