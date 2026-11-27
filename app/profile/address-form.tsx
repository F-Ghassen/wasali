import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { Button } from '@/components/shared/ui/primitives/Button';
import { Input } from '@/components/shared/ui/primitives/Input';
import { AddressFieldGroup } from '@/components/shared/ui/forms/AddressFieldGroup';
import { CountryCodeSelect } from '@/components/shared/ui/forms/CountryCodeSelect';
import { PersonAddressList } from '@/components/profile/PersonAddressList';
import { useAddressBook } from '@/hooks/useAddressBook';
import { ConfirmActionModal } from '@/components/shared/ui/modals';
import { useConfirmAction } from '@/hooks/useConfirmAction';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { toContactInput } from '@/utils/contacts';
import {
  addressBookResolver,
  emptyAddressBookValues,
  personToFormValues,
  placeToFormValues,
  toPersonData,
  toPlaceData,
  type AddressBookFormValues,
  type AddressBookType,
} from '@/utils/addressBookForm';

/**
 * Adds or edits one of the sender's own addresses (`type=place`), or a person's
 * details (`type=person`). A person's addresses are added from the person card,
 * not here. The route fixes the kind, so an entry can't change kind.
 */
export default function AddressFormScreen() {
  const router = useRouter();
  const { id, type: typeParam } = useLocalSearchParams<{ id?: string; type?: string }>();
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const { requestConfirm, confirmModal } = useConfirmAction();
  const showToast = useUIStore((s) => s.showToast);
  const {
    places,
    people,
    isLoading,
    refresh,
    savePlace,
    savePerson,
    setDefaultPersonAddress,
    removePersonAddress,
  } = useAddressBook(userId);

  const kind: AddressBookType = typeParam === 'person' ? 'person' : 'place';
  const place = id ? places.find((p) => p.id === id) : undefined;
  const person = id ? people.find((p) => p.id === id) : undefined;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AddressBookFormValues>({
    resolver: addressBookResolver,
    defaultValues: emptyAddressBookValues(kind),
  });

  const isEditing = Boolean(id);

  // Refetch when returning from a person's address screen, so the list is current.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const openPersonAddress = (personId: string, addressId?: string) =>
    router.push({ pathname: '/profile/person-address', params: { personId, id: addressId ?? '' } } as any);

  const handleSetDefaultPersonAddress = async (addressId: string) => {
    try {
      await setDefaultPersonAddress(addressId);
      showToast('Default address updated', 'success');
    } catch {
      showToast('Could not update the default address', 'error');
    }
  };

  const confirmDeletePersonAddress = (addressId: string) =>
    requestConfirm('Delete?', 'This address will be removed.', async () => {
      if (!person) return;
      try {
        await removePersonAddress(person.id, addressId);
        showToast('Deleted', 'success');
      } catch {
        showToast('Could not delete. Please try again.', 'error');
      }
    });

  // Prefill once the entry is in the list.
  useEffect(() => {
    if (place) reset(placeToFormValues(place));
    if (person) reset(personToFormValues(person));
  }, [place, person, reset]);

  // A new person has no id until saved, so their first address is added after saving the person.
  const addAddressToNewPerson = handleSubmit(async (values: AddressBookFormValues) => {
    try {
      const personId = await savePerson(toContactInput(toPersonData(values)));
      router.replace({ pathname: '/profile/person-address', params: { personId, id: '' } } as any);
    } catch {
      showToast('Could not save. Please try again.', 'error');
    }
  });

  const onSave = async (values: AddressBookFormValues) => {
    try {
      if (values.type === 'place') {
        await savePlace(toPlaceData(values), id);
        showToast(isEditing ? 'Updated' : 'Saved', 'success');
        router.back();
        return;
      }

      await savePerson(toContactInput(toPersonData(values)), id);
      showToast(isEditing ? 'Updated' : 'Saved', 'success');
      router.back();
    } catch {
      showToast('Could not save. Please try again.', 'error');
    }
  };

  if (isEditing && !isLoading && !place && !person) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>This entry no longer exists.</Text>
      </SafeAreaView>
    );
  }

  const title = isEditing
    ? kind === 'place' ? 'Edit Address' : 'Edit Person'
    : kind === 'place' ? 'New Address' : 'New Person';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {kind === 'place' ? (
            <>
              <Controller control={control} name="label" render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Label" placeholder="Home, Office (optional)" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.label?.message} />
              )} />
              <AddressFieldGroup control={control} watch={watch} setValue={setValue} errors={errors} />
            </>
          ) : (
            <>
              <Controller control={control} name="name" render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Name *" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.name?.message} />
              )} />
              <Text style={styles.sectionTitle}>Phone *</Text>
              <View style={styles.phoneRow}>
                <Controller control={control} name="countryCode" render={({ field: { onChange, value } }) => (
                  <CountryCodeSelect value={value} onChange={onChange} />
                )} />
                <View style={styles.flex}>
                  <Controller control={control} name="phoneNumber" render={({ field: { onChange, onBlur, value } }) => (
                    <Input placeholder="20 123 456" keyboardType="phone-pad" onChangeText={onChange} onBlur={onBlur} value={value} error={errors.phoneNumber?.message ?? errors.countryCode?.message} />
                  )} />
                </View>
              </View>
              <Controller control={control} name="whatsappEnabled" render={({ field: { onChange, value } }) => (
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Reachable on WhatsApp</Text>
                  <Switch value={value} onValueChange={onChange} />
                </View>
              )} />
              {(!isEditing || person) && (
                <>
                  <Text style={styles.sectionTitle}>Addresses</Text>
                  <PersonAddressList
                    addresses={person?.addresses ?? []}
                    onAdd={person ? () => openPersonAddress(person.id) : addAddressToNewPerson}
                    onEditAddress={(addressId) => openPersonAddress(person?.id ?? '', addressId)}
                    onSetDefaultAddress={handleSetDefaultPersonAddress}
                    onDeleteAddress={confirmDeletePersonAddress}
                  />
                </>
              )}
            </>
          )}

          <Button
            label={isEditing ? 'Save Changes' : 'Save'}
            onPress={handleSubmit(onSave)}
            isLoading={isSubmitting}
            disabled={isEditing && !isDirty}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
      <ConfirmActionModal {...confirmModal} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.light,
    backgroundColor: Colors.white,
  },
  back: { padding: Spacing.sm },
  backText: { fontSize: FontSize.lg, color: Colors.primary, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.text.primary },
  content: { padding: Spacing.base },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.base },
  switchLabel: { fontSize: FontSize.base, color: Colors.text.primary },
  sectionTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.text.secondary, marginVertical: Spacing.sm },
  phoneRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.base },
  notFound: { padding: Spacing.base, fontSize: FontSize.base, color: Colors.text.secondary },
});
